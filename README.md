# Engineering Data Management for Jigyasu

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?style=flat&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-DB%20%26%20Auth-47C28A?style=flat&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)
![Zustand](https://img.shields.io/badge/Zustand-State-brown?style=flat)
![Resend](https://img.shields.io/badge/Resend-Email-black?style=flat)

This is a comprehensive, production-grade Engineering Data Management tool built for **Jigyasu's Engineering Team**. Designed to streamline internal engineering workflows, this application handles data ingestion, task tracking, multi-tier approvals, and team communication smoothly with a modern web architecture.

## 🚀 Key Features

### 1. Robust Task & Workflow Management
- **My Tasks Dashboard**: Users have a dedicated area to track all assignments with advanced sorting and search functionalities.
- **Workflow Engine**: A multi-stage approval flow that manages state transitions (e.g., Draft -> Submitted -> Approved -> Rejected).
- **Interactive Modals**: Seamless inline dialogs for task approvals, rejections, and assignments without leaving the context.

### 2. Engineering Data Management
- **Excel Import/Export**: Natively parse and handle complex engineering data sheets directly via `.xlsx` integration.
- **Data Tables**: Rich data visualization featuring responsive tables, dynamic column sorting, and pagination.

### 3. Automated Email Notifications
- **Resend Integration**: High-deliverability transactional emails triggered automatically at key workflow stages:
  - Task Assignments
  - Data Submissions
  - Approvals & Sign-offs
  - Rejection / Rework Requests
- **Branded Templates**: Professionally crafted HTML email templates that ensure clear team communication.

### 4. Audit & Compliance
- **Audit Trails**: A complete history of actions taken on tasks and data, essential for engineering compliance.
- **Row Level Security (RLS)**: Deep integration with Supabase Postgres RLS policies to ensure users only see and modify data they have access to.

### 5. Secure Authentication & User Management
- **Supabase Auth**: Secure SSR-friendly login and session management.
- **Role-Based Access Control (RBAC)**: Manage users with different permissions (e.g., Submitter, Reviewer, Admin).

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4, Lucide React (Icons), `clsx` (Class composition)
- **State Management**: Zustand
- **Backend & Database**: Supabase (PostgreSQL, Realtime, Auth, RLS)
- **Email Service**: Resend
- **Utilities**: `date-fns` (Time parsing), `xlsx` (Excel handling)

---

## 🏗️ Project Structure

```bash
.
├── app/                  # Next.js App Router pages and API routes
│   ├── (dashboard)/      # Authenticated views (Audit Trail, Data Management, Tasks, Users)
│   ├── api/              # Serverless API endpoints (e.g., Email Sending)
│   └── login/            # Authentication views
├── components/           # Reusable UI components
│   ├── drawers/          # Slide-out panels
│   ├── modals/           # Dialogs (e.g., Workflow Modals)
│   └── layout/           # App shell, navigation, sidebar
├── lib/                  # Utilities, configuration, and email templates
├── hooks/                # Custom React Hooks
├── supabase/             # Database migrations and configuration
└── *.sql                 # Supabase schema and RLS patches (v1 to v7)
```

---

## 💻 Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm, yarn, or pnpm
- A Supabase Project (for DB and Auth)
- A Resend Account (for Emails)

### 1. Clone the repository
```bash
git clone https://github.com/your-org/jigyasu.git
cd jigyasu
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add the following:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="Jigyasu ERP <noreply@notify.jigyasu.co.in>"
```

### 4. Database Setup
The repository contains several `schema_patch_v*.sql` files. Run these SQL scripts in your Supabase SQL editor to set up the database schemas, policies, and workflow logic.
- Start from `schema_patch.sql` and apply sequentially up to `schema_patch_v7_workflow.sql`.
- Apply `audit_trail_rls_patch.sql` for logging infrastructure.

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📜 License & Deployment

- **Deployment**: The application is optimized for Vercel. Connect the GitHub repository to your Vercel account, set the environment variables, and deploy seamlessly.
- **License**: Private/Proprietary.