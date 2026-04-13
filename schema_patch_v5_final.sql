-- Phase 2 Final RLS Patch: JWT-Powered Authentication Rules
-- This completely bypasses the 'users' table blocking issue by securely reading the role directly from the authenticated token.

-- 1. Secure the Users Table (Ensure everyone can read basic profile info needed by the edge)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Public read users" ON users;
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);

-- 2. Purge old slow/blocked policies on experiments 
DROP POLICY IF EXISTS "exp_admin_select" ON experiments;
DROP POLICY IF EXISTS "exp_admin_all" ON experiments;
DROP POLICY IF EXISTS "exp_tester_select" ON experiments;
DROP POLICY IF EXISTS "exp_tester_update" ON experiments;
DROP POLICY IF EXISTS "exp_solution_select" ON experiments;
DROP POLICY IF EXISTS "exp_solution_update" ON experiments;
DROP POLICY IF EXISTS "exp_design_select" ON experiments;
DROP POLICY IF EXISTS "exp_design_update" ON experiments;
DROP POLICY IF EXISTS "exp_approver_select" ON experiments;
DROP POLICY IF EXISTS "exp_approver_update" ON experiments;
DROP POLICY IF EXISTS "exp_procurement_select" ON experiments;
DROP POLICY IF EXISTS "exp_procurement_update" ON experiments;

-- 3. Install new LIGHTSPEED JWT-based policies for experiments
-- Super Admin / Admin
CREATE POLICY "exp_admin_all" ON experiments
FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
);

-- Tester
CREATE POLICY "exp_tester_select" ON experiments
FOR SELECT USING (
  tester_target_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'tester'
);
CREATE POLICY "exp_tester_update" ON experiments
FOR UPDATE USING (
  tester_target_id = auth.uid() AND stage = 'Functional Testing'
);

-- Solution
CREATE POLICY "exp_solution_select" ON experiments
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'solution'
);
CREATE POLICY "exp_solution_update" ON experiments
FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'solution' AND stage = 'Solution Assignment'
);

-- Design
CREATE POLICY "exp_design_select" ON experiments
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'design'
);
CREATE POLICY "exp_design_update" ON experiments
FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'design' AND stage IN ('Handover', 'Design In Progress', 'File Upload')
);

-- Approver
CREATE POLICY "exp_approver_select" ON experiments
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'approver'
);
CREATE POLICY "exp_approver_update" ON experiments
FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'approver' AND stage = 'Design Approval'
);

-- Procurement
CREATE POLICY "exp_procurement_select" ON experiments
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'procurement'
);
CREATE POLICY "exp_procurement_update" ON experiments
FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'procurement' AND stage = 'Procurement'
);
