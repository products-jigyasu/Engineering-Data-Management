import { User } from './types';

// Mock current user (admin - Biswa)
export const MOCK_CURRENT_USER: User = {
  id: '1',
  name: 'Biswa',
  email: 'biswa@jigyasu.com',
  role: 'admin',
  status: 'active',
  created_at: '2024-01-01',
  avatar_color: '#c45c5c',
};

// Mock users
export const MOCK_USERS: User[] = [
  MOCK_CURRENT_USER,
  { id: '2', name: 'Biswajit Sahu', email: 'biswajit.s@jigyasu.com', role: 'tester', status: 'active', created_at: '2024-01-15', avatar_color: '#3b82f6' },
  { id: '3', name: 'Rati', email: 'rati@jigyasu.com', role: 'tester', status: 'active', created_at: '2024-01-15', avatar_color: '#8b5cf6' },
  { id: '4', name: 'Sushanta', email: 'sushanta@jigyasu.com', role: 'tester', status: 'active', created_at: '2024-02-01', avatar_color: '#059669' },
  { id: '5', name: 'Biswajit Swain', email: 'biswajit.sw@jigyasu.com', role: 'tester', status: 'active', created_at: '2024-02-01', avatar_color: '#d97706' },
  { id: '6', name: 'Guna', email: 'guna@jigyasu.com', role: 'tester', status: 'active', created_at: '2024-02-15', avatar_color: '#dc2626' },
  { id: '7', name: 'Abinash', email: 'abinash@jigyasu.com', role: 'solution', status: 'active', created_at: '2024-03-01', avatar_color: '#0891b2' },
  { id: '8', name: 'Aditya', email: 'aditya@jigyasu.com', role: 'solution', status: 'active', created_at: '2024-03-01', avatar_color: '#4f46e5' },
  { id: '9', name: 'Swadhin', email: 'swadhin@jigyasu.com', role: 'design', status: 'active', created_at: '2024-03-15', avatar_color: '#be185d' },
  { id: '10', name: 'Satwik Das', email: 'satwik@jigyasu.com', role: 'approver', status: 'active', created_at: '2024-04-01', avatar_color: '#7c3aed' },
  { id: '11', name: 'Procurement', email: 'procurement@jigyasu.com', role: 'procurement', status: 'active', created_at: '2024-04-01', avatar_color: '#0d9488' },
];

// Pipeline stats
export const MOCK_PIPELINE_STATS = {
  'Not Assigned': 18,
  'Functional Testing': 24,
  'Solution Assignment': 12,
  'Handover': 8,
  'Design In Progress': 15,
  'Design Approval': 6,
  'File Upload': 4,
  'Procurement': 3,
  'Completed': 62,
};

// Dashboard stats
export const MOCK_DASHBOARD_STATS = {
  total: 152,
  inProgress: 72,
  overdue: 5,
  completed: 62,
};

// Recent activity
export const MOCK_ACTIVITY = [
  { id: 1, text: 'Biswajit Sahu submitted FT result for "Simple Electric Circuit"', time: '10 minutes ago', type: 'submit' as const },
  { id: 2, text: 'Abinash was assigned as Solution Assignee for Exp #14', time: '1 hour ago', type: 'assign' as const },
  { id: 3, text: 'Swadhin accepted handover for "Ohm\'s Law Demo"', time: '2 hours ago', type: 'accept' as const },
  { id: 4, text: 'Design approved for "Electroplating of Cu"', time: '3 hours ago', type: 'approve' as const },
  { id: 5, text: 'Procurement checked for "Lemon/potato cell"', time: '5 hours ago', type: 'complete' as const },
];

// Mock experiments for table
export const MOCK_EXPERIMENTS = [
  { id: 1, sl_no: 1, name: 'How Steady is your hand?', grade: 'VI', stage: 'Solution Assignment', priority: 'Medium', deadline: '2026-04-20', ft_result: 'Not Okay', assignee: 'Abinash' },
  { id: 2, sl_no: 2, name: 'Simple Electric Circuit and its components', grade: 'VI', stage: 'Functional Testing', priority: 'High', deadline: '2026-04-18', ft_result: null, assignee: 'Biswajit Sahu' },
  { id: 3, sl_no: 3, name: 'Visible effect of current', grade: 'VII', stage: 'Functional Testing', priority: 'Medium', deadline: '2026-04-22', ft_result: null, assignee: 'Rati' },
  { id: 4, sl_no: 14, name: 'Effect of changing load on current', grade: 'X', stage: 'Design In Progress', priority: 'High', deadline: '2026-04-25', ft_result: 'Not Okay', assignee: 'Swadhin' },
  { id: 5, sl_no: 15, name: "Ohm's law demonstration", grade: 'X', stage: 'Design Approval', priority: 'Critical', deadline: '2026-04-15', ft_result: 'Not Okay', assignee: 'Swadhin' },
  { id: 6, sl_no: 35, name: 'Electrolysis of NaCl solution', grade: 'VIII', stage: 'Handover', priority: 'Low', deadline: '2026-05-01', ft_result: 'Not Okay', assignee: 'Abinash' },
  { id: 7, sl_no: 37, name: 'Electroplating of Cu', grade: 'VIII', stage: 'Completed', priority: 'Medium', deadline: '2026-03-30', ft_result: 'Not Okay', assignee: null },
  { id: 8, sl_no: 41, name: 'Uniform Speed: Drifter with motionshot', grade: 'IX', stage: 'Not Assigned', priority: 'Medium', deadline: null, ft_result: null, assignee: null },
  { id: 9, sl_no: 50, name: 'Accelerated motion: Ball on inclined plane', grade: 'IX', stage: 'File Upload', priority: 'Low', deadline: '2026-04-28', ft_result: 'Not Okay', assignee: 'Swadhin' },
  { id: 10, sl_no: 74, name: 'Reflection on a plane mirror', grade: 'VI', stage: 'Procurement', priority: 'Medium', deadline: '2026-04-30', ft_result: 'Not Okay', assignee: 'Procurement' },
];

export function getInitials(name?: string): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(name: string): string {
  const colors = ['#c45c5c', '#3b82f6', '#8b5cf6', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#be185d', '#7c3aed'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
