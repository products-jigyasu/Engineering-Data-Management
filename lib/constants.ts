// Stage definitions
export const STAGES = [
  'Not Assigned',
  'Functional Testing',
  'Solution Assignment',
  'Handover',
  'Design In Progress',
  'Design Approval',
  'File Upload',
  'Procurement',
  'Completed',
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Not Assigned': { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
  'Functional Testing': { bg: '#fef3c7', text: '#d97706', border: '#fbbf24' },
  'Solution Assignment': { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  'Handover': { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  'Design In Progress': { bg: '#fce7f3', text: '#db2777', border: '#f9a8d4' },
  'Design Approval': { bg: '#fff7ed', text: '#ea580c', border: '#fdba74' },
  'File Upload': { bg: '#ecfdf5', text: '#059669', border: '#6ee7b7' },
  'Procurement': { bg: '#f0f9ff', text: '#0284c7', border: '#7dd3fc' },
  'Completed': { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
};

// Roles
export const ROLES = {
  admin: 'Head of Operations',
  super_admin: 'Super Admin',
  tester: 'Functional Tester',
  solution: 'Solution Assignee',
  design: 'Design Team',
  approver: 'Approver',
  procurement: 'Procurement',
} as const;

export type Role = keyof typeof ROLES;

// Priority
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  Low: { bg: '#f3f4f6', text: '#6b7280' },
  Medium: { bg: '#dbeafe', text: '#2563eb' },
  High: { bg: '#fff7ed', text: '#ea580c' },
  Critical: { bg: '#fef2f2', text: '#dc2626' },
};

// Grades
export const GRADES = ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const;

// Navigation items
export const NAV_ITEMS = {
  admin: [
    { label: 'Dashboard', icon: 'LayoutDashboard', href: '/dashboard' },
    {
      label: 'Engineering',
      icon: 'FlaskConical',
      href: '#',
      children: [
        { label: 'Data Management', href: '/data-management' },
      ],
    },
    { label: 'Users', icon: 'Users', href: '/users' },
  ],
  nonAdmin: [
    { label: 'My Tasks', icon: 'CheckSquare', href: '/my-tasks' },
  ],
} as const;
