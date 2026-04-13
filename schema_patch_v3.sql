-- Add status column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Update RLS for workflow_tasks
DROP POLICY IF EXISTS "Anyone can read tasks" ON workflow_tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON workflow_tasks;
DROP POLICY IF EXISTS "Admins manage active tasks" ON workflow_tasks;

-- AC-9: Supabase RLS Policies for workflow_tasks

-- Super admin and admin: full access
CREATE POLICY "admin_full_access" ON workflow_tasks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Tester: own assigned experiments only
-- Wait, the workflow_tasks table has assignee_id! AC-9 says ft_assignee_id but that's in experiments table.
-- For workflow_tasks, assignee_id is the user directly mapped to the task!
CREATE POLICY "tester_own_tasks" ON workflow_tasks
FOR SELECT USING (
  assignee_id = auth.uid() AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('tester', 'Functional Tester'))
);

CREATE POLICY "tester_update_ft" ON workflow_tasks
FOR UPDATE USING (
  assignee_id = auth.uid() 
  AND stage = 'Functional Testing'
);

-- Solution assignee: own assigned experiments
CREATE POLICY "solution_own_tasks" ON workflow_tasks
FOR SELECT USING (
  assignee_id = auth.uid() AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('solution', 'Solution Assignee'))
);

CREATE POLICY "solution_update" ON workflow_tasks
FOR UPDATE USING (
  assignee_id = auth.uid()
  AND stage = 'Solution Assignment'
);

-- Design team: handover through file upload stages
CREATE POLICY "design_tasks" ON workflow_tasks
FOR SELECT USING (
  stage IN ('Handover', 'Design In Progress', 'Design Approval', 'File Upload')
  AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('design', 'Design Team'))
);

CREATE POLICY "design_update" ON workflow_tasks
FOR UPDATE USING (
  stage IN ('Handover', 'Design In Progress', 'Design Approval', 'File Upload')
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('design', 'Design Team'))
);

-- Approver: design approval stage only
CREATE POLICY "approver_tasks" ON workflow_tasks
FOR SELECT USING (
  stage = 'Design Approval' AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('approver', 'Approver'))
);

CREATE POLICY "approver_update" ON workflow_tasks
FOR UPDATE USING (
  stage = 'Design Approval'
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('approver', 'Approver'))
);

-- Procurement: procurement stage only
CREATE POLICY "procurement_tasks" ON workflow_tasks
FOR SELECT USING (
  stage = 'Procurement' AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('procurement', 'Procurement'))
);

CREATE POLICY "procurement_update" ON workflow_tasks
FOR UPDATE USING (
  stage = 'Procurement'
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('procurement', 'Procurement'))
);


-- AC-9 says apply same pattern to experiments table
DROP POLICY IF EXISTS "Anyone can read experiments" ON experiments;
DROP POLICY IF EXISTS "Authenticated users can update experiments" ON experiments;
DROP POLICY IF EXISTS "Admins can insert experiments" ON experiments;

-- Admin full access
CREATE POLICY "exp_admin_full" ON experiments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Tester: only experiments where tester_target_id = their UUID
CREATE POLICY "exp_tester_own" ON experiments
FOR SELECT USING (tester_target_id = auth.uid());

CREATE POLICY "exp_tester_update" ON experiments
FOR UPDATE USING (
  tester_target_id = auth.uid()
);

-- Solution: only where sa_target_id = their UUID
CREATE POLICY "exp_solution_own" ON experiments
FOR SELECT USING (sa_target_id = auth.uid());

CREATE POLICY "exp_solution_update" ON experiments
FOR UPDATE USING (
  sa_target_id = auth.uid()
);

-- Design: stages
CREATE POLICY "exp_design_tasks" ON experiments
FOR SELECT USING (
  stage IN ('Handover', 'Design In Progress', 'Design Approval', 'File Upload')
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('design', 'Design Team'))
);

CREATE POLICY "exp_design_update" ON experiments
FOR UPDATE USING (
  stage IN ('Handover', 'Design In Progress', 'Design Approval', 'File Upload')
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('design', 'Design Team'))
);

-- Approver
CREATE POLICY "exp_approver_tasks" ON experiments
FOR SELECT USING (
  stage = 'Design Approval' AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('approver', 'Approver'))
);

CREATE POLICY "exp_approver_update" ON experiments
FOR UPDATE USING (
  stage = 'Design Approval'
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('approver', 'Approver'))
);

-- Procurement
CREATE POLICY "exp_procurement_tasks" ON experiments
FOR SELECT USING (
  stage = 'Procurement' AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('procurement', 'Procurement'))
);

CREATE POLICY "exp_procurement_update" ON experiments
FOR UPDATE USING (
  stage = 'Procurement'
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('procurement', 'Procurement'))
);

