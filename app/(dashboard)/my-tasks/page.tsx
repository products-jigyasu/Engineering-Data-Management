'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import Topbar from '@/components/layout/topbar';
import { CheckSquare, Clock, CheckCircle2, FlaskConical, ArrowRight, Search } from 'lucide-react';
import { getInitials } from '@/lib/mock-data';
import { STAGE_COLORS, PRIORITY_COLORS, ROLES } from '@/lib/constants';
import { useDrawer } from '@/hooks/use-drawer';
import { useModal } from '@/hooks/use-modal';
import { createClient } from '@/lib/supabase/client';

export default function MyTasksPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { onOpen: openDrawer } = useDrawer();
  const { onOpen: openModal } = useModal();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [actionRequired, setActionRequired] = useState<any[]>([]);
  const [inProgress, setInProgress] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]); // flat list for deep-link lookup
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setLoading(false); return; }

        const profile = authUser.user_metadata || {};
        const role = profile.role || 'member';
        const userId = authUser.id;
        setUser({ ...profile, id: userId });

        const { data: expData } = await supabase.from('experiments').select('*').order('updated_at', { ascending: false });
        if (!expData) { setLoading(false); return; }

        let req: any[] = [];
        let waiting: any[] = [];
        let comp: any[] = [];

        if (role === 'super_admin' || role === 'admin') {
          // Admins: must act on Not Assigned, Solution Assignment, Design Approval
          const adminActionStages = ['Not Assigned', 'Solution Assignment', 'Design Approval'];
          req = expData.filter(e => adminActionStages.includes(e.stage));
          // Waiting = active experiments NOT in admin-action stages (handled by team, admin monitors)
          waiting = expData.filter(e => !adminActionStages.includes(e.stage) && e.stage !== 'Completed');
          comp = expData.filter(e => e.stage === 'Completed');

        } else if (role === 'tester') {
          // Testers: only see experiments assigned to them
          const mine = expData.filter(e => e.tester_id === userId);
          // Action required: still at Functional Testing stage (their turn)
          req = mine.filter(e => e.stage === 'Functional Testing');
          // Waiting: they've submitted (past FT stage) but not completed
          waiting = mine.filter(e => e.stage !== 'Functional Testing' && e.stage !== 'Completed');
          comp = mine.filter(e => e.stage === 'Completed');

        } else if (role === 'solution') {
          // Solution users: only see their assigned experiments
          const mine = expData.filter(e => e.solution_assignee_id === userId);
          req = mine.filter(e => e.stage === 'Solution In Progress');
          waiting = mine.filter(e => e.stage !== 'Solution In Progress' && e.stage !== 'Completed' && e.stage !== 'Not Assigned' && e.stage !== 'Functional Testing' && e.stage !== 'Solution Assignment');
          comp = mine.filter(e => e.stage === 'Completed');

        } else if (role === 'design') {
          // Design users: see experiments in design stages
          const mine = expData.filter(e => e.design_assignee_id === userId || e.stage === 'Design Team Acceptance');
          // Action: acceptance pending OR design in progress (their work) OR file upload
          req = mine.filter(e =>
            e.stage === 'Design Team Acceptance' && !e.design_assignee_id ||
            (e.design_assignee_id === userId && (e.stage === 'Design In Progress' || e.stage === 'File Upload'))
          );
          waiting = mine.filter(e =>
            e.design_assignee_id === userId &&
            // In waiting: Design Approval (submitted, pending admin review), Design Team Acceptance (accepted, now their job)
            (e.stage === 'Design Approval' || e.stage === 'Design Team Acceptance') ||
            (
              e.design_assignee_id === userId &&
              e.stage !== 'Design In Progress' && e.stage !== 'File Upload' &&
              e.stage !== 'Completed' && e.stage !== 'Not Assigned' &&
              e.stage !== 'Functional Testing' && e.stage !== 'Solution Assignment' && e.stage !== 'Solution In Progress'
            )
          );
          comp = expData.filter(e => e.design_assignee_id === userId && e.stage === 'Completed');

        } else if (role === 'procurement') {
          req = expData.filter(e => e.stage === 'Procurement');
          waiting = [];
          comp = expData.filter(e => e.procurement_verified_by === userId && e.stage === 'Completed');

        } else {
          // fallback — show nothing sensitive
          req = [];
          waiting = [];
          comp = [];
        }

        setActionRequired(req);
        setInProgress(waiting);
        setCompleted(comp);
        setAllTasks([...req, ...waiting, ...comp]);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  // Deep-link: auto-open modal if ?exp=<id> is in URL (from notification click)
  useEffect(() => {
    const expId = searchParams.get('exp');
    if (!expId || loading || allTasks.length === 0) return;
    const exp = allTasks.find(t => t.id === expId);
    if (exp) openModal('workflow', exp);
  }, [searchParams, allTasks, loading]);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'My Tasks' }]} />

      <main className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        {/* Personal Header */}
        <div className="card animate-fade-in-up" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="flex items-center gap-4 my-tasks-header-inner">
            <div
              className="task-exp-image"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: user?.avatar_color || '#c45c5c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(user?.name)}
            </div>
            <div className="flex-1">
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>
                {user?.name?.split(' ').map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(' ') || 'Guest User'}
              </h2>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>
                {user?.role === 'super_admin' || user?.role === 'admin' ? 'SUPER ADMIN' : user?.role ? ROLES[user.role as keyof typeof ROLES] : 'Read Only'} · Engineering Design
              </p>
            </div>
            <div className="flex items-center gap-6 my-tasks-header-stats">
              {[
                { label: 'Action Required', count: actionRequired.length, color: '#ef4444', id: 'section-action' },
                { label: 'In Progress', count: inProgress.length, color: '#3b82f6', id: 'section-progress' },
                { label: 'Completed', count: completed.length, color: '#16a34a', id: 'section-completed' },
              ].map(stat => (
                <button
                  key={stat.id}
                  className="text-center"
                  onClick={() => document.getElementById(stat.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '8px 12px', borderRadius: '10px',
                    transition: 'background 0.15s ease',
                    fontFamily: "'Inter',sans-serif",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = `${stat.color}10`)}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  title={`Scroll to ${stat.label}`}
                >
                  <p style={{ fontSize: '22px', fontWeight: 700, color: stat.color }}>{stat.count}</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' }}>{stat.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="card animate-fade-in-up" style={{ padding: '14px 20px', marginBottom: '24px' }}>
          <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '0 12px', height: '40px', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search tasks by experiment name, SL No, or grade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#374151', width: '100%', padding: '0 10px', fontFamily: "'Inter', sans-serif" }}
            />
          </div>
        </div>

        {/* Task sections */}
        {actionRequired.length === 0 && inProgress.length === 0 && completed.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb' }} className="animate-fade-in-up">
            <CheckSquare size={48} style={{ color: '#d1d5db', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>No experiments assigned yet</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', maxWidth: '300px', margin: '0 auto' }}>You will see your tasks here once they are assigned to you.</p>
          </div>
        ) : (
          [
            { title: 'Action Required', tasks: actionRequired, borderColor: '#ef4444', icon: CheckSquare, iconColor: '#ef4444', id: 'section-action' },
            { title: 'Waiting / In Progress', tasks: inProgress, borderColor: '#3b82f6', icon: Clock, iconColor: '#3b82f6', id: 'section-progress' },
            { title: 'Completed', tasks: completed, borderColor: '#16a34a', icon: CheckCircle2, iconColor: '#16a34a', id: 'section-completed' },
          ].map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.title} id={section.id} style={{ marginBottom: '24px', scrollMarginTop: '24px' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
                  <SectionIcon size={18} style={{ color: section.iconColor }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a2e' }}>
                    {section.title}
                  </h3>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: section.iconColor,
                      background: `${section.iconColor}12`,
                      padding: '2px 8px',
                      borderRadius: '100px',
                    }}
                  >
                    {section.tasks.length}
                  </span>
                </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {section.tasks.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>No tasks in this section.</p>
                  </div>
                ) : (
                  (() => {
                    const filteredTasks = section.tasks.filter((task) => {
                      if (!searchQuery) return true;
                      const sq = searchQuery.toLowerCase();
                      return (
                        task.name?.toLowerCase().includes(sq) ||
                        String(task.sl_no).includes(sq) ||
                        task.grade?.toLowerCase().includes(sq)
                      );
                    });

                    if (filteredTasks.length === 0) {
                      return (
                        <div style={{ padding: '24px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                          <p style={{ fontSize: '13px', color: '#6b7280' }}>No matching tasks found.</p>
                        </div>
                      );
                    }

                    return filteredTasks.map((task) => {
                      const stageColor = STAGE_COLORS[task.stage] || { bg: '#f3f4f6', text: '#6b7280' };
                      const prioColor = PRIORITY_COLORS[task.priority] || { bg: '#f3f4f6', text: '#6b7280' };
                      return (
                        <div
                          key={task.id}
                          className="card card-interactive animate-fade-in-up task-card-inner"
                          style={{
                          padding: '16px 20px',
                          borderLeft: `3px solid ${section.borderColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          cursor: 'pointer',
                        }}
                        onClick={() => openDrawer(task)}
                      >
                        {/* Experiment image placeholder */}
                        <div
                          className="task-exp-image"
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '10px',
                            background: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FlaskConical size={20} style={{ color: '#9ca3af' }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                            <p
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#1a1a2e',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {task.name}
                            </p>
                            <span className="badge" style={{ background: stageColor.bg, color: stageColor.text, fontSize: '11px' }}>
                              {task.stage}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              Grade {task.grade}
                            </span>
                            <span className="badge" style={{ background: prioColor.bg, color: prioColor.text, fontSize: '10px' }}>
                              {task.priority}
                            </span>
                            {task.deadline && (
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                Due: {task.deadline}
                              </span>
                            )}
                            {task.updated_at && (
                              <span style={{ fontSize: '12px', color: '#9ca3af', borderLeft: '1px solid #e5e7eb', paddingLeft: '10px' }} title="Last updated">
                                {new Date(task.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                              </span>
                            )}
                          </div>

                          {/* Stage progress strip — 10 stages */}
                          <div className="flex items-center gap-1" style={{ marginTop: '8px' }}>
                            {['NA','FT','SA','SI','DTA','DI','DA','FU','PR','C'].map((s, idx) => {
                              const stageMap: Record<string, number> = {
                                'Not Assigned': 0,
                                'Functional Testing': 1,
                                'Solution Assignment': 2,
                                'Solution In Progress': 3,
                                'Design Team Acceptance': 4,
                                'Design In Progress': 5,
                                'Design Approval': 6,
                                'File Upload': 7,
                                'Procurement': 8,
                                'Completed': 9,
                              };
                              const currentIdx = stageMap[task.stage] ?? 0;
                              const isCompleted = idx < currentIdx;
                              const isCurrent = idx === currentIdx;
                              return (
                                <div
                                  key={s}
                                  title={Object.keys(stageMap)[idx]}
                                  style={{
                                    flex: 1,
                                    height: '3px',
                                    borderRadius: '2px',
                                    background: isCompleted ? '#c45c5c' : isCurrent ? '#e07a7a' : '#e5e7eb',
                                    transition: 'background 0.3s ease',
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Action buttons — unified workflow modal */}
                        {section.title === 'Action Required' && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openModal('workflow', task)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#c45c5c',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: "'Inter',sans-serif",
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              Take Action <ArrowRight size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })
      )}
      </main>
    </>
  );
}
