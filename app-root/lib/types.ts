export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'tester' | 'solution' | 'design' | 'approver' | 'procurement';
  status: 'active' | 'inactive';
  created_at: string;
  avatar_color?: string;
}

export interface Experiment {
  id: number;
  sl_no: number;
  name: string;
  grade: string;
  image_url: string | null;
  created_by: string;
  created_at: string;
}

export interface WorkflowTask {
  id: number;
  experiment_id: number;
  stage: string;
  priority: string;
  deadline: string | null;

  // Stage 1
  ft_assignee_id: string | null;
  ft_result: string | null;
  ft_remarks: string | null;
  ft_submitted_at: string | null;

  // Stage 2
  solution_assignee_id: string | null;
  solution_assigned_at: string | null;

  // Stage 3
  handover_physical_model: boolean;
  handover_engineering_data: boolean;
  handover_kt: boolean;
  handover_given_at: string | null;

  // Stage 4
  received_physical_model: boolean;
  received_engineering_data: boolean;
  received_kt: boolean;
  handover_accepted_at: string | null;
  design_deadline: string | null;

  // Stage 5
  design_submitted_at: string | null;
  biswa_approval: string | null;
  biswa_comments: string | null;
  biswa_reviewed_at: string | null;
  satwik_approval: string | null;
  satwik_comments: string | null;
  satwik_reviewed_at: string | null;

  // Stage 6
  folder_link: string | null;
  file_uploaded_at: string | null;

  // Stage 7
  procurement_status: string;
  procurement_checked_at: string | null;

  assigned_by: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  task_id: number;
  actor_id: string;
  action: string;
  from_stage: string | null;
  to_stage: string | null;
  notes: string | null;
  created_at: string;
}

// Combined type for table displays
export interface ExperimentWithTask extends Experiment {
  task: WorkflowTask;
  ft_assignee?: User;
  solution_assignee?: User;
}
