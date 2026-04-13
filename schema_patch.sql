-- Upgrade User Table for Super Admin & Email support
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Update role constraint to allow super_admin and handle casing
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'super_admin', 'tester', 'solution', 'design', 'approver', 'procurement', 'Admin', 'Super Admin', 'Functional Tester', 'Solution Assignee', 'Design Team', 'Approver', 'Procurement'));
