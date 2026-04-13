-- =============================================================
-- Jigyasu ERP — Schema Patch v7: Full 10-Stage Workflow
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. Add all missing workflow columns to experiments
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS stage text DEFAULT 'Not Assigned',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS on_hold boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS on_hold_remarks text,

  -- Stage 1: FT
  ADD COLUMN IF NOT EXISTS tester text,
  ADD COLUMN IF NOT EXISTS tester_id uuid,
  ADD COLUMN IF NOT EXISTS ft_result text,
  ADD COLUMN IF NOT EXISTS ft_remarks text,
  ADD COLUMN IF NOT EXISTS ft_submitted_at timestamptz,

  -- Stage 2: Solution
  ADD COLUMN IF NOT EXISTS solution_assignee text,
  ADD COLUMN IF NOT EXISTS solution_assignee_id uuid,
  ADD COLUMN IF NOT EXISTS solution_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS solution_remarks text,

  -- Stage 3: Handover checklist
  ADD COLUMN IF NOT EXISTS handover_physical_model boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS handover_engineering_data boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS handover_kt boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS handover_given_at timestamptz,

  -- Stage 4: Design acceptance
  ADD COLUMN IF NOT EXISTS design_assignee_id uuid,
  ADD COLUMN IF NOT EXISTS design_assignee text,
  ADD COLUMN IF NOT EXISTS design_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS acceptance_remarks text,
  ADD COLUMN IF NOT EXISTS rejection_remarks text,

  -- Stage 5: Design In Progress
  ADD COLUMN IF NOT EXISTS design_deadline date,
  ADD COLUMN IF NOT EXISTS design_files_link text,
  ADD COLUMN IF NOT EXISTS design_remarks text,
  ADD COLUMN IF NOT EXISTS design_submitted_at timestamptz,

  -- Stage 6: Design Approval
  ADD COLUMN IF NOT EXISTS biswa_approval text,
  ADD COLUMN IF NOT EXISTS biswa_comments text,
  ADD COLUMN IF NOT EXISTS biswa_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_by_id uuid,
  ADD COLUMN IF NOT EXISTS approval_by text,
  ADD COLUMN IF NOT EXISTS approval_remarks text,

  -- Stage 7: File Upload
  ADD COLUMN IF NOT EXISTS folder_link text,
  ADD COLUMN IF NOT EXISTS additional_link text,
  ADD COLUMN IF NOT EXISTS upload_remarks text,
  ADD COLUMN IF NOT EXISTS file_uploaded_at timestamptz,

  -- Stage 8: Procurement
  ADD COLUMN IF NOT EXISTS procurement_status text DEFAULT 'Not Checked',
  ADD COLUMN IF NOT EXISTS procurement_notes text,
  ADD COLUMN IF NOT EXISTS procurement_verified_by uuid,
  ADD COLUMN IF NOT EXISTS procurement_verified_by_name text,
  ADD COLUMN IF NOT EXISTS procurement_checked_at timestamptz,

  -- Metadata
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Update stage constraint to include new stages
ALTER TABLE public.experiments DROP CONSTRAINT IF EXISTS experiments_stage_check;
ALTER TABLE public.experiments ADD CONSTRAINT experiments_stage_check CHECK (stage IN (
  'Not Assigned', 'Functional Testing', 'Solution Assignment',
  'Solution In Progress', 'Design Team Acceptance', 'Design In Progress',
  'Design Approval', 'File Upload', 'Procurement', 'Completed'
));

-- 3. Update priority constraint
ALTER TABLE public.experiments DROP CONSTRAINT IF EXISTS experiments_priority_check;
ALTER TABLE public.experiments ADD CONSTRAINT experiments_priority_check
  CHECK (priority IN ('Low', 'Medium', 'High', 'Critical'));

-- 4. Fix users role to include super_admin
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN (
  'super_admin', 'admin', 'tester', 'solution', 'design', 'approver', 'procurement'
));

-- Add avatar_color if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_color text;

-- 5. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id serial primary key,
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info' check (type in ('info', 'success', 'warning', 'error')),
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own notifications
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- Admins can see all
DROP POLICY IF EXISTS "notifications_admin" ON public.notifications;
CREATE POLICY "notifications_admin" ON public.notifications
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- Anyone authenticated can insert (needed for group notifications via service role)
-- Note: actual inserts from admin actions should use service role key

-- 6. Update audit_log to use experiment_id (not task_id)
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS experiment_id integer references public.experiments(id) on delete cascade;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS details text;

-- 7. RLS: Allow all authenticated to read/update experiments (workflow progression)
DROP POLICY IF EXISTS "experiments_update_authenticated" ON public.experiments;
CREATE POLICY "experiments_update_authenticated" ON public.experiments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "experiments_read_all" ON public.experiments;
CREATE POLICY "experiments_read_all" ON public.experiments
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_experiments_all" ON public.experiments;
CREATE POLICY "admin_experiments_all" ON public.experiments
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- 8. Auto-updated_at trigger on experiments
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN new.updated_at = now(); RETURN new; END;
$$;

DROP TRIGGER IF EXISTS tr_experiments_updated_at ON public.experiments;
CREATE TRIGGER tr_experiments_updated_at
  BEFORE UPDATE ON public.experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 9. Index for stage queries
CREATE INDEX IF NOT EXISTS idx_experiments_stage ON public.experiments(stage);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- 10. Reload schema cache
NOTIFY pgrst, 'reload schema';
