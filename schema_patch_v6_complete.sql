-- ================================================================
-- Jigyasu ERP — Schema Patch: Add all missing columns to experiments
-- Run this in Supabase SQL Editor
-- ================================================================

-- Add missing workflow columns to experiments table
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS stage text DEFAULT 'Not Assigned',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS avatar_color text,

  -- Functional Testing (Stage 1)
  ADD COLUMN IF NOT EXISTS tester text,
  ADD COLUMN IF NOT EXISTS tester_id uuid references public.users(id),
  ADD COLUMN IF NOT EXISTS ft_result text,
  ADD COLUMN IF NOT EXISTS ft_remarks text,
  ADD COLUMN IF NOT EXISTS ft_submitted_at timestamptz,

  -- Solution Assignment (Stage 2)
  ADD COLUMN IF NOT EXISTS solution_assignee text,
  ADD COLUMN IF NOT EXISTS solution_assignee_id uuid references public.users(id),
  ADD COLUMN IF NOT EXISTS solution_assigned_at timestamptz,

  -- Handover (Stage 3)
  ADD COLUMN IF NOT EXISTS handover_physical_model boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS handover_engineering_data boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS handover_kt boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS handover_given_at timestamptz,

  -- Design (Stage 4)
  ADD COLUMN IF NOT EXISTS received_physical_model boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_engineering_data boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_kt boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS handover_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS design_deadline date,

  -- Design Approval (Stage 5)
  ADD COLUMN IF NOT EXISTS design_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS biswa_approval text,
  ADD COLUMN IF NOT EXISTS biswa_comments text,
  ADD COLUMN IF NOT EXISTS biswa_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS satwik_approval text,
  ADD COLUMN IF NOT EXISTS satwik_comments text,
  ADD COLUMN IF NOT EXISTS satwik_reviewed_at timestamptz,

  -- File Upload (Stage 6)
  ADD COLUMN IF NOT EXISTS folder_link text,
  ADD COLUMN IF NOT EXISTS file_uploaded_at timestamptz,

  -- Procurement (Stage 7)
  ADD COLUMN IF NOT EXISTS procurement_status text DEFAULT 'Not Checked',
  ADD COLUMN IF NOT EXISTS procurement_checked_at timestamptz,

  -- Metadata
  ADD COLUMN IF NOT EXISTS assigned_by uuid references public.users(id),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add check constraint for stage (safe — won't fail if exists)
ALTER TABLE public.experiments
  DROP CONSTRAINT IF EXISTS experiments_stage_check;

ALTER TABLE public.experiments
  ADD CONSTRAINT experiments_stage_check CHECK (stage IN (
    'Not Assigned', 'Functional Testing', 'Solution Assignment',
    'Handover', 'Design In Progress', 'Design Approval',
    'File Upload', 'Procurement', 'Completed'
  ));

-- Add check for priority
ALTER TABLE public.experiments
  DROP CONSTRAINT IF EXISTS experiments_priority_check;

ALTER TABLE public.experiments
  ADD CONSTRAINT experiments_priority_check CHECK (priority IN ('Low', 'Medium', 'High', 'Critical'));

-- Fix the role check on users to include super_admin
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN (
    'super_admin', 'admin', 'tester', 'solution', 'design', 'approver', 'procurement'
  ));

-- Update RLS policies to also allow super_admin full access
DROP POLICY IF EXISTS "admin_experiments_all" ON public.experiments;
CREATE POLICY "admin_experiments_all" ON public.experiments
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "admin_users_all" ON public.users;
CREATE POLICY "admin_users_all" ON public.users
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "admin_tasks_all" ON public.workflow_tasks;
CREATE POLICY "admin_tasks_all" ON public.workflow_tasks
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- Allow all authenticated users to read experiments
DROP POLICY IF EXISTS "experiments_read_all" ON public.experiments;
CREATE POLICY "experiments_read_all" ON public.experiments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow all authenticated users to update experiments (for workflow progression)
DROP POLICY IF EXISTS "experiments_update_authenticated" ON public.experiments;
CREATE POLICY "experiments_update_authenticated" ON public.experiments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at trigger on experiments
DROP TRIGGER IF EXISTS tr_experiments_updated_at ON public.experiments;
CREATE TRIGGER tr_experiments_updated_at
  BEFORE UPDATE ON public.experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Refresh schema cache (important!)
NOTIFY pgrst, 'reload schema';
