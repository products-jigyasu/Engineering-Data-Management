-- 1. users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Design Team', 'Solution Assignee', 'Functional Tester', 'Procurement', 'Approver', 'Read Only')),
  avatar_color TEXT
);

-- 2. experiments table
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sl_no INTEGER,
  name TEXT NOT NULL,
  grade TEXT,
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  stage TEXT CHECK (stage IN ('Not Assigned', 'Functional Testing', 'Solution Assignment', 'Handover', 'Design In Progress', 'Design Approval', 'File Upload', 'Procurement', 'Completed')),
  image_path TEXT,

  -- Stage 1
  tester_target_id UUID REFERENCES users(id),
  assignment_deadline DATE,
  
  -- Stage 2
  ft_result TEXT CHECK (ft_result IN ('Okay', 'Not Okay')),
  ft_remarks TEXT,
  
  -- Stage 3A
  sa_target_id UUID REFERENCES users(id),
  
  -- Stage 3B
  handover_physical_model BOOLEAN DEFAULT false,
  handover_engineering_data BOOLEAN DEFAULT false,
  handover_kt BOOLEAN DEFAULT false,
  handover_notes TEXT,
  handover_given_at TIMESTAMPTZ,
  
  -- Stage 4
  received_physical_model BOOLEAN DEFAULT false,
  received_engineering_data BOOLEAN DEFAULT false,
  received_kt BOOLEAN DEFAULT false,
  receipt_notes TEXT,
  handover_accepted_at TIMESTAMPTZ,
  design_deadline DATE,
  
  -- Stage 5A
  design_submitted_at TIMESTAMPTZ,
  design_notes TEXT,
  
  -- Stage 5B & C
  biswa_approval TEXT,
  biswa_comments TEXT,
  biswa_reviewed_at TIMESTAMPTZ,
  satwik_approval TEXT,
  satwik_comments TEXT,
  satwik_reviewed_at TIMESTAMPTZ,
  
  -- Stage 6
  folder_link TEXT,
  file_uploaded_at TIMESTAMPTZ,
  
  -- Stage 7
  procurement_status TEXT,
  procurement_notes TEXT,
  procurement_checked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. workflow_tasks table
CREATE TABLE workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  assignee_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('Action Required', 'In Progress', 'Completed')) DEFAULT 'Action Required',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. audit_log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enable
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Admins can update users" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
);

-- experiments policies 
CREATE POLICY "Anyone can read experiments" ON experiments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update experiments" ON experiments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert experiments" ON experiments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
);

-- workflow_tasks policies
CREATE POLICY "Anyone can read tasks" ON workflow_tasks FOR SELECT USING (true);
CREATE POLICY "Users can update their tasks" ON workflow_tasks FOR UPDATE USING (assignee_id = auth.uid());
CREATE POLICY "Admins manage active tasks" ON workflow_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
);

-- audit_log policies
CREATE POLICY "Anyone can read audit logs" ON audit_log FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert audit logs" ON audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage Config
INSERT INTO storage.buckets (id, name, public) VALUES ('experiment-images', 'experiment-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public read experiment images" ON storage.objects FOR SELECT USING (bucket_id = 'experiment-images');
CREATE POLICY "Authenticated upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'experiment-images' AND auth.uid() IS NOT NULL);
