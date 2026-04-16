-- Audit Trail RLS Patch
-- Run this in Supabase SQL Editor to allow super_admins to read the audit_log table.

-- Enable RLS on audit_log (safe to run even if already enabled)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop any existing select policy to avoid conflicts
DROP POLICY IF EXISTS "audit_log_super_admin_select" ON audit_log;
DROP POLICY IF EXISTS "audit_log_admin_select" ON audit_log;

-- Allow only super_admin to read all audit logs via JWT role
CREATE POLICY "audit_log_super_admin_select" ON audit_log
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

-- Allow the service role (used by workflow actions to INSERT logs) to write
-- Note: service_role bypasses RLS by default, so INSERT will work without a policy.
-- But if you're inserting via anon/authenticated key in the modal, add this:
DROP POLICY IF EXISTS "audit_log_authenticated_insert" ON audit_log;
CREATE POLICY "audit_log_authenticated_insert" ON audit_log
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
