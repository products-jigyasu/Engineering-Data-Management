'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Topbar from '@/components/layout/topbar';
import {
  Users,
  UserCheck,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUpRight,
  FlaskConical,
  ClipboardCheck,
  Handshake,
  Paintbrush,
  ShieldCheck,
  FolderUp,
  ShoppingCart,
  Trophy,
  ChevronRight,
  FileText,
  BarChart3,
  Layers,
} from 'lucide-react';
import { getInitials } from '@/lib/mock-data';
import { STAGE_COLORS } from '@/lib/constants';

const tabs = [
  { label: 'Overview', icon: BarChart3 },
  { label: 'Pipeline', icon: Layers },
  { label: 'Workload', icon: Users },
];

const stageIcons: Record<string, React.ElementType> = {
  'Not Assigned': AlertCircle,
  'Functional Testing': FlaskConical,
  'Solution Assignment': ClipboardCheck,
  'Solution In Progress': Handshake,
  'Design Team Acceptance': UserCheck,
  'Design In Progress': Paintbrush,
  'Design Approval': ShieldCheck,
  'File Upload': FolderUp,
  'Procurement': ShoppingCart,
  'Completed': Trophy,
};

const activityIcons: Record<string, { icon: React.ElementType; color: string }> = {
  submit: { icon: FileText, color: '#3b82f6' },
  assign: { icon: UserCheck, color: '#8b5cf6' },
  accept: { icon: Handshake, color: '#059669' },
  approve: { icon: ShieldCheck, color: '#16a34a' },
  complete: { icon: Trophy, color: '#d97706' },
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const [dashboardStats, setDashboardStats] = useState({ total: 0, inProgress: 0, overdue: 0, completed: 0 });
  const [pipelineStats, setPipelineStats] = useState<Record<string, number>>({
    'Not Assigned': 0,
    'Functional Testing': 0,
    'Solution Assignment': 0,
    'Handover': 0,
    'Design In Progress': 0,
    'Design Approval': 0,
    'File Upload': 0,
    'Procurement': 0,
    'Completed': 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [workloadData, setWorkloadData] = useState<any[]>([]);

  useEffect(() => {
    async function getDashboardData() {
      try {
        setLoading(true);
        // 1. Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          
          if (profile) {
            setUser(profile);
          } else {
            // Fallback for Rahul or anyone missing profile
            setUser({
              name: authUser.email?.split('@')[0] || 'User',
              role: 'member'
            });
          }
        }

        // 2. Get stats
        const { data: experiments, error: expError } = await supabase
          .from('experiments')
          .select('id, stage, deadline, name, grade, design_assignee, design_deadline, design_files_link, created_at');

        if (experiments) {
          const stats = {
            total: experiments.length,
            inProgress: experiments.filter(e => e.stage !== 'Completed' && e.stage !== 'Not Assigned').length,
            completed: experiments.filter(e => e.stage === 'Completed').length,
            overdue: experiments.filter(e => e.deadline && new Date(e.deadline) < new Date() && e.stage !== 'Completed').length
          };
          setDashboardStats(stats);
          // Pending Approvals = Design Approval stage experiments
          const pendingApprovalExps = experiments
            .filter(e => e.stage === 'Design Approval')
            .map(e => ({
              id: e.id,
              name: e.name,
              grade: e.grade,
              designer: e.design_assignee,
              deadline: e.design_deadline,
              filesLink: e.design_files_link,
              time: e.created_at ? new Date(e.created_at).toLocaleDateString() : '',
              stage: 'Design Approval',
            }));
          setPendingApprovals(pendingApprovalExps);


          const pStats: Record<string, number> = {
            'Not Assigned': 0,
            'Functional Testing': 0,
            'Solution Assignment': 0,
            'Solution In Progress': 0,
            'Design Team Acceptance': 0,
            'Design In Progress': 0,
            'Design Approval': 0,
            'File Upload': 0,
            'Procurement': 0,
            'Completed': 0,
          };
          experiments.forEach(e => {
            if (pStats[e.stage] !== undefined) pStats[e.stage]++;
            else pStats[e.stage] = (pStats[e.stage] || 0) + 1;
          });
          setPipelineStats(pStats);
        }

        // 3. Get team workload from users + experiments
        const { data: allUsers } = await supabase.from('users').select('id, name, role, status, avatar_color').eq('status', 'active');
        const { data: allExp } = await supabase.from('experiments').select('tester_id, solution_assignee_id, design_assignee_id, procurement_verified_by, stage');
        if (allUsers && allExp) {
          const activeExps = allExp.filter(e => e.stage !== 'Completed');
          const totalActive = activeExps.length || 1;
          const workload = allUsers.map(u => {
            const count =
              activeExps.filter(e =>
                e.tester_id === u.id ||
                e.solution_assignee_id === u.id ||
                e.design_assignee_id === u.id
              ).length;
            return { ...u, activeCount: count, percentage: Math.round((count / Math.max(totalActive, 1)) * 100) };
          }).filter(u => u.activeCount > 0 || u.role === 'admin' || u.role === 'super_admin');
          workload.sort((a, b) => b.activeCount - a.activeCount);
          setWorkloadData(workload);
        }

        // 3. Get recent activity (audit log)
        const { data: logs } = await supabase
          .from('audit_log')
          .select('*, experiments(name)')
          .order('created_at', { ascending: false })
          .limit(5);

        if (logs) {
          setRecentActivity(logs.map(log => {
            const logDate = new Date(log.created_at);
            const now = new Date();
            const isToday = logDate.toDateString() === now.toDateString();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const isYesterday = logDate.toDateString() === yesterday.toDateString();
            const timeStr = logDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const label = isToday ? `${timeStr} today` : isYesterday ? `${timeStr} yesterday` : logDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + `, ${timeStr}`;
            return {
              id: log.id,
              text: `${log.action} ${log.experiments?.name || 'an experiment'}`,
              time: label,
              type: log.action.toLowerCase().includes('assign') ? 'assign' : 'submit'
            };
          }));
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    getDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours(); // browser local time automatically
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night'; // 9 PM – 5 AM
  };

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Engineering' }]} />

      <main className="flex-1 overflow-y-auto" style={{ padding: '0' }}>
        {/* Tabs row */}
        <div
          className="flex items-center"
          style={{
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 24px',
            gap: '0',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center tab-bar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.label)}
                  style={{
                    padding: '12px 20px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#c45c5c' : '#6b7280',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderBottom: isActive ? '2px solid #c45c5c' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#374151';
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  {tab.label}
                </button>
              );
            })}

            {/* New Dashboard button */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#c45c5c',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Plus size={14} />
              New Dashboard
            </button>
          </div>


        </div>

        {/* Content area */}
        <div style={{ padding: '24px' }} className="responsive-content">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <div className="w-10 h-10 border-4 border-[#c45c5c]/20 border-t-[#c45c5c] rounded-full animate-spin" />
              <p className="text-sm text-gray-400 font-medium">Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'Overview' && (
                <>
                  {/* Greeting Banner */}
                  <div
                    className="animate-fade-in-up greeting-banner"
                    style={{
                      background: 'linear-gradient(135deg, #c45c5c 0%, #e07a7a 40%, #d4908f 100%)',
                      borderRadius: '14px',
                      padding: '28px 32px',
                      marginBottom: '24px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Decorative circles */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-40px',
                        right: '-20px',
                        width: '180px',
                        height: '180px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-60px',
                        right: '80px',
                        width: '140px',
                        height: '140px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                      }}
                    />

                    <h2
                      style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: '6px',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {getGreeting()}, {user?.name?.split(' ').map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(' ') || 'Guest User'}
                    </h2>
                    <p
                      style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.85)',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      Here&apos;s what&apos;s happening with your Engineering Design Management today.
                    </p>
                  </div>

                  {/* Stat Cards Row */}
                  <div className="grid-responsive-4 animate-fade-in-up" style={{ marginBottom: '24px' }}>
                    {[
                      {
                        label: 'Total Experiments',
                        value: dashboardStats.total,
                        icon: FlaskConical,
                        color: '#c45c5c',
                        bgColor: '#fdf2f2',
                      },
                      {
                        label: 'In Progress',
                        value: dashboardStats.inProgress,
                        icon: TrendingUp,
                        color: '#3b82f6',
                        bgColor: '#eff6ff',
                      },
                      {
                        label: 'Overdue',
                        value: dashboardStats.overdue,
                        icon: AlertCircle,
                        color: '#ef4444',
                        bgColor: '#fef2f2',
                      },
                      {
                        label: 'Completed',
                        value: dashboardStats.completed,
                        icon: CheckCircle2,
                        color: '#16a34a',
                        bgColor: '#f0fdf4',
                      },
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div
                          key={stat.label}
                          className="card card-interactive animate-fade-in-up"
                          style={{
                            padding: '20px',
                            cursor: 'pointer',
                            borderLeft: `3px solid ${stat.color}`,
                          }}
                        >
                          <div className="flex items-start justify-between" style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>{stat.label}</p>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: stat.bgColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Icon size={18} style={{ color: stat.color }} />
                            </div>
                          </div>
                          <p style={{ fontSize: '30px', fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>
                            {stat.value}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Second row: Pending Approvals + Recent Activity */}
                  <div
                    className="dashboard-two-col"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      marginBottom: '24px',
                    }}
                  >
                    {/* Pending Approvals */}
                    <div className="card animate-fade-in-up" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>Pending Approvals</h3>
                          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                            {pendingApprovals.length} design{pendingApprovals.length !== 1 ? 's' : ''} awaiting review
                          </p>
                        </div>
                        {pendingApprovals.length > 0 && (
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>
                            {pendingApprovals.length} pending
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        {pendingApprovals.length === 0 ? (
                          <div style={{ padding: '20px 0', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', color: '#9ca3af' }}>No pending design approvals.</p>
                          </div>
                        ) : (
                          pendingApprovals.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              style={{
                                padding: '10px 12px',
                                background: '#fffbeb',
                                borderRadius: '8px',
                                border: '1px solid #fde68a',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                              }}
                              onClick={() => router.push(`/data-management?exp=${item.id}`)}
                              onMouseOver={(e) => (e.currentTarget.style.background = '#fef3c7')}
                              onMouseOut={(e) => (e.currentTarget.style.background = '#fffbeb')}
                            >
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{item.name}</p>
                                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                                  Grade {item.grade} {item.designer ? `· ${item.designer}` : ''}
                                </p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/data-management?stage=Design+Approval`); }}
                                style={{ padding: '4px 10px', border: 'none', borderRadius: '6px', background: '#c45c5c', color: 'white', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: "'Inter',sans-serif" }}
                              >
                                Review →
                              </button>
                            </div>
                          ))
                        )}
                        {pendingApprovals.length > 4 && (
                          <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>+{pendingApprovals.length - 4} more</p>
                        )}
                      </div>

                      <button
                        onClick={() => router.push('/data-management?stage=Design+Approval')}
                        className="btn btn-outline"
                        style={{ width: '100%', borderColor: '#e5e7eb', fontSize: '13px' }}
                      >
                        View All Pending Approvals
                      </button>
                    </div>

                    {/* Recent Activity */}
                    <div className="card animate-fade-in-up" style={{ padding: '24px' }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                        <h3
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#1a1a2e',
                          }}
                        >
                          Recent Activity
                        </h3>
                        <a
                          href="#"
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#c45c5c',
                            textDecoration: 'none',
                          }}
                        >
                          View All
                        </a>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {recentActivity.length === 0 ? (
                          <div style={{ padding: '20px 0', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', color: '#9ca3af' }}>No recent activity.</p>
                          </div>
                        ) : (
                          recentActivity.map((activity) => {
                            const actIcon = activityIcons[activity.type] || { icon: FileText, color: '#6b7280' };
                            const ActivityIcon = actIcon.icon;
                            return (
                              <div
                                key={activity.id}
                                className="flex items-start gap-3"
                                style={{
                                  padding: '12px 0',
                                  borderBottom: '1px solid #f3f4f6',
                                }}
                              >
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: `${actIcon.color}12`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                  }}
                                >
                                  <ActivityIcon size={15} style={{ color: actIcon.color }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
                                    {activity.text}
                                  </p>
                                  <p style={{ fontSize: '11px', color: '#c45c5c', marginTop: '2px', fontWeight: 500 }}>
                                    {activity.time}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Row */}
                  <div className="card animate-fade-in-up" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#1a1a2e',
                        marginBottom: '20px',
                      }}
                    >
                      Experiment Pipeline
                    </h3>
                    <div
                      className="pipeline-stage-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(9, 1fr)',
                        gap: '8px',
                        overflowX: 'auto',
                        paddingBottom: '8px',
                      }}
                    >
                      {Object.entries(pipelineStats).map(([stage, count], idx) => {
                        const colors = STAGE_COLORS[stage] || { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
                        const StageIcon = stageIcons[stage] || AlertCircle;
                        return (
                          <div
                            key={stage}
                            style={{
                              background: colors.bg,
                              borderRadius: '10px',
                              padding: '14px 10px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              border: `1px solid ${colors.border}40`,
                              position: 'relative',
                            }}
                            className="card-interactive"
                          >
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 8px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                              }}
                            >
                              <StageIcon size={16} style={{ color: colors.text }} />
                            </div>
                            <p
                              style={{
                                fontSize: '22px',
                                fontWeight: 700,
                                color: colors.text,
                                lineHeight: 1,
                                marginBottom: '4px',
                              }}
                            >
                              {count}
                            </p>
                            <p
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: colors.text,
                                opacity: 0.8,
                                lineHeight: 1.3,
                              }}
                            >
                              {stage}
                            </p>

                            {/* Arrow connector */}
                            {idx < Object.entries(pipelineStats).length - 1 && (
                              <div
                                style={{
                                  position: 'absolute',
                                  right: '-12px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  zIndex: 2,
                                  color: '#d1d5db',
                                }}
                              >
                                <ChevronRight size={14} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom stats bar */}
                  <div
                    className="flex items-center gap-6 animate-fade-in-up stats-bottom-bar"
                    style={{
                      padding: '12px 20px',
                      background: 'white',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>
                      Active Tests: {pipelineStats['Functional Testing'] || 0}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}>
                      Design Queue: {(pipelineStats['Design In Progress'] || 0) + (pipelineStats['Design Approval'] || 0)}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#d97706' }}>
                      Pending Review: {pendingApprovals.length}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>
                      Overdue Alerts: {dashboardStats.overdue}
                    </span>
                  </div>
                </>
              )}

              {activeTab === 'Pipeline' && (
                <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Summary strip */}
                  <div className="pipeline-summary-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                    {[
                      { label: 'Total Experiments', value: dashboardStats.total, color: '#c45c5c', bg: '#fdf2f2' },
                      { label: 'Active / In-Pipeline', value: dashboardStats.inProgress, color: '#3b82f6', bg: '#eff6ff' },
                      { label: 'Completion Rate', value: dashboardStats.total > 0 ? `${Math.round((dashboardStats.completed / dashboardStats.total) * 100)}%` : '0%', color: '#16a34a', bg: '#f0fdf4' },
                    ].map(s => (
                      <div key={s.label} className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${s.color}` }}>
                        <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                        <p style={{ fontSize: '28px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Colourful stage cards grid */}
                  <div className="pipeline-stage-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px' }}>
                    {Object.entries(pipelineStats).map(([stage, count]) => {
                      const colors = STAGE_COLORS[stage] || { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
                      const StageIcon = stageIcons[stage] || AlertCircle;
                      const percentage = dashboardStats.total > 0 ? Math.round((count / dashboardStats.total) * 100) : 0;
                      const maxCount = Math.max(...Object.values(pipelineStats));
                      const barPct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                      return (
                        <div
                          key={stage}
                          style={{
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '12px',
                            padding: '18px 20px',
                            cursor: count > 0 ? 'pointer' : 'default',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          }}
                          onClick={() => count > 0 && router.push(`/data-management?stage=${encodeURIComponent(stage)}`)}
                          onMouseOver={(e) => { if (count > 0) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; } }}
                          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          {/* Top row: icon + count */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', boxShadow: `0 2px 8px ${colors.border}60`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <StageIcon size={16} style={{ color: colors.text }} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stage}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '28px', fontWeight: 800, color: colors.text, lineHeight: 1 }}>{count}</span>
                              <span style={{ fontSize: '11px', color: colors.text, opacity: 0.7, display: 'block', marginTop: '2px' }}>{percentage}% of total</span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.6)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                            <div style={{ width: `${barPct}%`, height: '100%', background: colors.text, borderRadius: '4px', transition: 'width 0.6s ease', opacity: 0.8 }} />
                          </div>

                          {/* Explore button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); if (count > 0) router.push(`/data-management?stage=${encodeURIComponent(stage)}`); }}
                            disabled={count === 0}
                            style={{
                              padding: '7px 16px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: count > 0 ? 'white' : '#6b7280',
                              background: count > 0 ? colors.text : 'white',
                              border: count > 0 ? 'none' : '1.5px solid #d1d5db',
                              borderRadius: '7px',
                              cursor: count > 0 ? 'pointer' : 'default',
                              fontFamily: "'Inter',sans-serif",
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: count > 0 ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                              transition: 'box-shadow 0.15s ease',
                            }}
                          >
                            {count > 0 ? `View ${count} ${count === 1 ? 'experiment' : 'experiments'} →` : 'No experiments'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'Workload' && (
                <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Summary cards */}
                  <div className="workload-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {[
                      { label: 'Active Team Members', value: workloadData.length, color: '#3b82f6', bg: '#eff6ff' },
                      { label: 'Total Active Experiments', value: dashboardStats.inProgress, color: '#c45c5c', bg: '#fdf2f2' },
                      { label: 'Avg. Load per Person', value: workloadData.length > 0 ? (dashboardStats.inProgress / workloadData.length).toFixed(1) : '0', color: '#16a34a', bg: '#f0fdf4' },
                    ].map(s => (
                      <div key={s.label} className="card" style={{ padding: '20px', borderLeft: `3px solid ${s.color}` }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{s.label}</p>
                        <p style={{ fontSize: '28px', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Workload table */}
                  <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>Individual Workload</h3>
                      <p style={{ fontSize: '12px', color: '#9ca3af' }}>Based on active (non-completed) experiments</p>
                    </div>

                    {workloadData.length === 0 ? (
                      <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        <Users size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: '14px', color: '#9ca3af' }}>No active team members with assignments.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {workloadData.map((member, idx) => {
                          const maxCount = workloadData[0]?.activeCount || 1;
                          const barPct = maxCount > 0 ? Math.round((member.activeCount / maxCount) * 100) : 0;
                          const loadColor =
                            member.activeCount === 0 ? '#d1d5db' :
                            member.activeCount <= 1 ? '#16a34a' :
                            member.activeCount <= 3 ? '#f59e0b' : '#ef4444';
                          const loadLabel =
                            member.activeCount === 0 ? 'Free' :
                            member.activeCount === 1 ? 'Light' :
                            member.activeCount <= 3 ? 'Busy' : 'Heavy';
                          const roleLabel: Record<string, string> = {
                            super_admin: 'Super Admin', admin: 'Head of Ops',
                            tester: 'FT', solution: 'Solution', design: 'Design',
                            procurement: 'Procurement', approver: 'Approver',
                          };
                          return (
                            <div key={member.id} className="workload-member-row" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              {/* Avatar */}
                              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: member.avatar_color || '#c45c5c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                                {getInitials(member.name)}
                              </div>
                              {/* Name + role */}
                              <div className="workload-name-col" style={{ width: '160px', flexShrink: 0 }}>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</p>
                                <p style={{ fontSize: '11px', color: '#9ca3af' }}>{roleLabel[member.role] || member.role}</p>
                              </div>
                              {/* Bar */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${barPct}%`, height: '100%', background: loadColor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                                </div>
                              </div>
                              {/* Count + % */}
                              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a2e' }}>{member.activeCount} active</p>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: loadColor }}>{loadLabel}</p>
                              </div>
                              {/* Load badge */}
                              <span className="workload-pct-badge" style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: `${loadColor}18`, color: loadColor, flexShrink: 0, minWidth: '44px', textAlign: 'center' }}>
                                {barPct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '20px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                      {[{ color: '#16a34a', label: 'Light (1)' }, { color: '#f59e0b', label: 'Busy (2–3)' }, { color: '#ef4444', label: 'Heavy (4+)' }].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color }} />
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
