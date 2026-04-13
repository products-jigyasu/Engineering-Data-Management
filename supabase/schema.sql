-- =============================================================
-- Jigyasu Engineering Design Management — Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- =============================================================

-- 1. Users table (linked to Supabase Auth)
-- ---------------------------------------------------------
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'tester', 'solution', 'design', 'approver', 'procurement')),
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now()
);

-- 2. Experiments table
-- ---------------------------------------------------------
create table if not exists public.experiments (
  id serial primary key,
  sl_no integer,
  name text not null,
  grade text not null,
  image_url text,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- 3. Workflow Tasks table (one per experiment)
-- ---------------------------------------------------------
create table if not exists public.workflow_tasks (
  id serial primary key,
  experiment_id integer references public.experiments(id) on delete cascade,
  stage text not null default 'Not Assigned'
    check (stage in (
      'Not Assigned', 'Functional Testing', 'Solution Assignment',
      'Handover', 'Design In Progress', 'Design Approval',
      'File Upload', 'Procurement', 'Completed'
    )),
  priority text default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Critical')),
  deadline date,

  -- Stage 1: Functional Testing
  ft_assignee_id uuid references public.users(id),
  ft_result text check (ft_result in ('Okay', 'Not Okay') or ft_result is null),
  ft_remarks text,
  ft_submitted_at timestamptz,

  -- Stage 2: Solution Assignment
  solution_assignee_id uuid references public.users(id),
  solution_assigned_at timestamptz,

  -- Stage 3: Handover checklist (given by Solution Assignee)
  handover_physical_model boolean default false,
  handover_engineering_data boolean default false,
  handover_kt boolean default false,
  handover_given_at timestamptz,

  -- Stage 4: Handover received (by Design Team)
  received_physical_model boolean default false,
  received_engineering_data boolean default false,
  received_kt boolean default false,
  handover_accepted_at timestamptz,
  design_deadline date,

  -- Stage 5: Design Approval
  design_submitted_at timestamptz,
  biswa_approval text check (biswa_approval in ('Approved', 'Rejected') or biswa_approval is null),
  biswa_comments text,
  biswa_reviewed_at timestamptz,
  satwik_approval text check (satwik_approval in ('Approved', 'Rejected') or satwik_approval is null),
  satwik_comments text,
  satwik_reviewed_at timestamptz,

  -- Stage 6: File Upload
  folder_link text,
  file_uploaded_at timestamptz,

  -- Stage 7: Procurement
  procurement_status text default 'Not Checked' check (procurement_status in ('Checked', 'Not Checked')),
  procurement_checked_at timestamptz,

  -- Metadata
  assigned_by uuid references public.users(id),
  completed_at timestamptz,
  updated_at timestamptz default now()
);

-- 4. Audit Log table
-- ---------------------------------------------------------
create table if not exists public.audit_log (
  id serial primary key,
  task_id integer references public.workflow_tasks(id) on delete cascade,
  actor_id uuid references public.users(id),
  action text not null,
  from_stage text,
  to_stage text,
  notes text,
  created_at timestamptz default now()
);

-- =============================================================
-- Indexes for performance
-- =============================================================
create index if not exists idx_workflow_tasks_stage on public.workflow_tasks(stage);
create index if not exists idx_workflow_tasks_experiment on public.workflow_tasks(experiment_id);
create index if not exists idx_workflow_tasks_ft_assignee on public.workflow_tasks(ft_assignee_id);
create index if not exists idx_workflow_tasks_solution_assignee on public.workflow_tasks(solution_assignee_id);
create index if not exists idx_audit_log_task on public.audit_log(task_id);
create index if not exists idx_experiments_grade on public.experiments(grade);

-- =============================================================
-- Row Level Security (RLS) Policies
-- =============================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.experiments enable row level security;
alter table public.workflow_tasks enable row level security;
alter table public.audit_log enable row level security;

-- Helper function: get current user's role
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.users where id = auth.uid();
$$;

-- ---- USERS table policies ----

-- Admin: full access
create policy "admin_users_all" on public.users
  for all using (public.get_user_role() = 'admin');

-- Others: can read their own row
create policy "users_read_own" on public.users
  for select using (id = auth.uid());

-- Others: can read all users (needed for name lookups)
create policy "users_read_all" on public.users
  for select using (true);

-- ---- EXPERIMENTS table policies ----

-- Admin: full access
create policy "admin_experiments_all" on public.experiments
  for all using (public.get_user_role() = 'admin');

-- All authenticated: can read experiments
create policy "experiments_read_all" on public.experiments
  for select using (auth.uid() is not null);

-- ---- WORKFLOW_TASKS table policies ----

-- Admin: full access
create policy "admin_tasks_all" on public.workflow_tasks
  for all using (public.get_user_role() = 'admin');

-- Tester: read/update where they are ft_assignee
create policy "tester_tasks_read" on public.workflow_tasks
  for select using (
    public.get_user_role() = 'tester' and ft_assignee_id = auth.uid()
  );

create policy "tester_tasks_update" on public.workflow_tasks
  for update using (
    public.get_user_role() = 'tester' and ft_assignee_id = auth.uid()
  );

-- Solution: read/update where they are solution_assignee
create policy "solution_tasks_read" on public.workflow_tasks
  for select using (
    public.get_user_role() = 'solution' and solution_assignee_id = auth.uid()
  );

create policy "solution_tasks_update" on public.workflow_tasks
  for update using (
    public.get_user_role() = 'solution' and solution_assignee_id = auth.uid()
  );

-- Design: read/update handover through file upload stages
create policy "design_tasks_read" on public.workflow_tasks
  for select using (
    public.get_user_role() = 'design' and
    stage in ('Handover', 'Design In Progress', 'Design Approval', 'File Upload')
  );

create policy "design_tasks_update" on public.workflow_tasks
  for update using (
    public.get_user_role() = 'design' and
    stage in ('Handover', 'Design In Progress', 'Design Approval', 'File Upload')
  );

-- Approver: read/update design approval stage
create policy "approver_tasks_read" on public.workflow_tasks
  for select using (
    public.get_user_role() = 'approver' and stage = 'Design Approval'
  );

create policy "approver_tasks_update" on public.workflow_tasks
  for update using (
    public.get_user_role() = 'approver' and stage = 'Design Approval'
  );

-- Procurement: read/update procurement stage
create policy "procurement_tasks_read" on public.workflow_tasks
  for select using (
    public.get_user_role() = 'procurement' and stage = 'Procurement'
  );

create policy "procurement_tasks_update" on public.workflow_tasks
  for update using (
    public.get_user_role() = 'procurement' and stage = 'Procurement'
  );

-- ---- AUDIT_LOG table policies ----

-- Admin: full access
create policy "admin_audit_all" on public.audit_log
  for all using (public.get_user_role() = 'admin');

-- All authenticated: can read audit logs
create policy "audit_read_all" on public.audit_log
  for select using (auth.uid() is not null);

-- All authenticated: can insert (for logging their actions)
create policy "audit_insert_all" on public.audit_log
  for insert with check (auth.uid() is not null);

-- =============================================================
-- Auto-update updated_at trigger
-- =============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tr_workflow_tasks_updated_at
  before update on public.workflow_tasks
  for each row execute function public.update_updated_at();
