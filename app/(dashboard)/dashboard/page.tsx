'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Topbar from '@/components/layout/topbar';
import {
  Users,
  UserCheck,
  TrendingUp,
  Clock,
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
  'Handover': Handshake,
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
  const [pendingApprovals] = useState<any[]>([]);

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
          .select('stage, deadline');

        if (experiments) {
          const stats = {
            total: experiments.length,
            inProgress: experiments.filter(e => e.stage !== 'Completed' && e.stage !== 'Not Assigned').length,
            completed: experiments.filter(e => e.stage === 'Completed').length,
            overdue: experiments.filter(e => e.deadline && new Date(e.deadline) < new Date() && e.stage !== 'Completed').length
          };
          setDashboardStats(stats);

          const pStats: Record<string, number> = {
            'Not Assigned': 0,
            'Functional Testing': 0,
            'Solution Assignment': 0,
            'Handover': 0,
            'Design In Progress': 0,
            'Design Approval': 0,
            'File Upload': 0,
            'Procurement': 0,
            'Completed': 0,
          };
          experiments.forEach(e => {
            if (pStats[e.stage] !== undefined) pStats[e.stage]++;
          });
          setPipelineStats(pStats);
        }

        // 3. Get recent activity (audit log)
        const { data: logs } = await supabase
          .from('audit_log')
          .select('*, experiments(name)')
          .order('created_at', { ascending: false })
          .limit(5);

        if (logs) {
          setRecentActivity(logs.map(log => ({
            id: log.id,
            text: `${log.action} ${log.experiments?.name || 'an experiment'}`,
            time: new Date(log.created_at).toLocaleTimeString() + ' today',
            type: log.action.toLowerCase().includes('assign') ? 'assign' : 'submit'
          })));
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
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
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

          {/* Last Updated */}
          <div className="flex items-center gap-1.5" style={{ fontSize: '12px', color: '#9ca3af' }}>
            <Clock size={13} />
            Last updated: 2 mins ago
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
                    className="animate-fade-in-up"
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
                        change: '0 this month',
                        changeColor: '#9ca3af',
                      },
                      {
                        label: 'In Progress',
                        value: dashboardStats.inProgress,
                        icon: TrendingUp,
                        color: '#3b82f6',
                        bgColor: '#eff6ff',
                        change: '0 awaiting review',
                        changeColor: '#9ca3af',
                      },
                      {
                        label: 'Overdue',
                        value: dashboardStats.overdue,
                        icon: AlertCircle,
                        color: '#ef4444',
                        bgColor: '#fef2f2',
                        change: '0 critical',
                        changeColor: '#9ca3af',
                      },
                      {
                        label: 'Completed',
                        value: dashboardStats.completed,
                        icon: CheckCircle2,
                        color: '#16a34a',
                        bgColor: '#f0fdf4',
                        change: '0% completion rate',
                        changeColor: '#9ca3af',
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
                          <p
                            style={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: stat.changeColor,
                              marginTop: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ArrowUpRight size={13} />
                            {stat.change}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Second row: Pending Approvals + Recent Activity */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      marginBottom: '24px',
                    }}
                  >
                    {/* Pending Approvals */}
                    <div className="card animate-fade-in-up" style={{ padding: '24px' }}>
                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#1a1a2e',
                          marginBottom: '4px',
                        }}
                      >
                        Pending Approvals
                      </h3>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
                        {pendingApprovals.length} requests awaiting your review
                      </p>

                      {/* Quick preview of pending items */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        {pendingApprovals.length === 0 ? (
                          <div style={{ padding: '20px 0', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', color: '#9ca3af' }}>No pending approvals.</p>
                          </div>
                        ) : (
                          pendingApprovals.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between"
                              style={{
                                padding: '10px 12px',
                                background: '#f9fafb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                              onMouseOut={(e) => (e.currentTarget.style.background = '#f9fafb')}
                            >
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{item.name}</p>
                                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{item.time}</p>
                              </div>
                              <span className="badge badge-warning">{item.stage}</span>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        className="btn btn-outline"
                        style={{
                          width: '100%',
                          borderColor: '#e5e7eb',
                          fontSize: '13px',
                        }}
                      >
                        Review Requests
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
                    className="flex items-center gap-6 animate-fade-in-up"
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
                <div className="card animate-fade-in-up" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
                    Pipeline Distribution
                  </h3>
                  <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '12px' }}>
                        <th style={{ padding: '12px', fontWeight: 600 }}>Stage</th>
                        <th style={{ padding: '12px', fontWeight: 600 }}>Count</th>
                        <th style={{ padding: '12px', fontWeight: 600 }}>% of Total</th>
                        <th style={{ padding: '12px', fontWeight: 600 }}>Overdue</th>
                        <th style={{ padding: '12px', fontWeight: 600 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(pipelineStats).map(([stage, count]) => {
                        const percentage = dashboardStats.total > 0 ? Math.round((count / dashboardStats.total) * 100) : 0;
                        return (
                          <tr key={stage} style={{ borderBottom: '1px solid #f3f4f6' }} className="hover:bg-gray-50">
                            <td style={{ padding: '14px 12px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                              <div className="flex items-center gap-2">
                                <span
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: STAGE_COLORS[stage]?.bg || '#d1d5db',
                                  }}
                                />
                                {stage}
                              </div>
                            </td>
                            <td style={{ padding: '14px 12px', fontSize: '13px', color: '#1a1a2e' }}>{count}</td>
                            <td style={{ padding: '14px 12px' }}>
                              <div className="flex items-center gap-2">
                                <div style={{ flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '4px' }}>
                                  <div
                                    style={{
                                      width: `${percentage}%`,
                                      height: '100%',
                                      background: STAGE_COLORS[stage]?.bg || '#9ca3af',
                                      borderRadius: '4px',
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '12px', color: '#6b7280', minWidth: '30px' }}>
                                  {percentage}%
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 12px', fontSize: '13px', color: '#ef4444' }}>0</td>
                            <td style={{ padding: '14px 12px' }}>
                              <button
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#c45c5c',
                                  borderRadius: '4px',
                                  border: '1px solid #fecaca',
                                  background: '#fdf2f2',
                                  cursor: 'pointer',
                                }}
                              >
                                Explore
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'Workload' && (
                <div className="card animate-fade-in-up" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
                    Team Workload
                  </h3>
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <Users size={32} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>No workload data available</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                      Team member metrics will appear here.
                    </p>
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
