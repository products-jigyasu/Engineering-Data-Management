'use client';

import { useState, useEffect } from 'react';

import Topbar from '@/components/layout/topbar';
import { CheckSquare, Clock, CheckCircle2, FlaskConical, ArrowRight } from 'lucide-react';
import { getInitials } from '@/lib/mock-data';
import { STAGE_COLORS, PRIORITY_COLORS, ROLES } from '@/lib/constants';
import { useDrawer } from '@/hooks/use-drawer';
import { createClient } from '@/lib/supabase/client';

export default function MyTasksPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { onOpen: openDrawer } = useDrawer();
  const supabase = createClient();

  const [actionRequired, setActionRequired] = useState<any[]>([]);
  const [inProgress, setInProgress] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        let currentUser = null;
        if (authUser) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
          if (profile) {
            setUser(profile);
            currentUser = profile;
          } else {
             setUser({ name: 'Guest User', role: 'member' });
             currentUser = { name: 'Guest User', role: 'member' };
          }
        }

        // Fetch experiments
        const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
        const { data: expData } = await supabase.from('experiments').select('*');
        
        if (expData) {
           const allExps = expData;
           // Group tasks dynamically
           // For super admin: everything not completed goes to Action Required (or in progress)
           // For now, let's put any active tasks in "Action Required" if super admin, or "In Progress"
           const req = allExps.filter(e => e.stage !== 'Completed' && e.stage !== 'Not Assigned');
           const notAssigned = allExps.filter(e => e.stage === 'Not Assigned');
           const comp = allExps.filter(e => e.stage === 'Completed');
           
           if (isSuperAdmin) {
             setActionRequired(notAssigned.concat(req));
             setInProgress(req); // Show in progress too
             setCompleted(comp);
           } else {
             // For regular users, simulate assignments
             setActionRequired(req);
             setInProgress([]);
             setCompleted(comp);
           }
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'My Tasks' }]} />

      <main className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        {/* Personal Header */}
        <div className="card animate-fade-in-up" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="flex items-center gap-4">
            <div
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
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444' }}>{actionRequired.length}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>Action Required</p>
              </div>
              <div className="text-center">
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#3b82f6' }}>{inProgress.length}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>In Progress</p>
              </div>
              <div className="text-center">
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#16a34a' }}>{completed.length}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Task sections */}
        {[
          { title: 'Action Required', tasks: actionRequired, borderColor: '#ef4444', icon: CheckSquare, iconColor: '#ef4444' },
          { title: 'Waiting / In Progress', tasks: inProgress, borderColor: '#3b82f6', icon: Clock, iconColor: '#3b82f6' },
          { title: 'Completed', tasks: completed, borderColor: '#16a34a', icon: CheckCircle2, iconColor: '#16a34a' },
        ].map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.title} style={{ marginBottom: '24px' }}>
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
                  section.tasks.map((task) => {
                    const stageColor = STAGE_COLORS[task.stage] || { bg: '#f3f4f6', text: '#6b7280' };
                    const prioColor = PRIORITY_COLORS[task.priority] || { bg: '#f3f4f6', text: '#6b7280' };
                    return (
                      <div
                        key={task.id}
                        className="card card-interactive animate-fade-in-up"
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
                          </div>

                          {/* Stage progress strip */}
                          <div className="flex items-center gap-1" style={{ marginTop: '8px' }}>
                            {['FT', 'SA', 'HO', 'DI', 'DA', 'FU', 'PR'].map((stage, idx) => {
                              const stageMap: Record<string, number> = {
                                'Not Assigned': -1,
                                'Functional Testing': 0,
                                'Solution Assignment': 1,
                                'Handover': 2,
                                'Design In Progress': 3,
                                'Design Approval': 4,
                                'File Upload': 5,
                                'Procurement': 6,
                                'Completed': 7,
                              };
                              const currentIdx = stageMap[task.stage] ?? -1;
                              const isCompleted = idx < currentIdx;
                              const isCurrent = idx === currentIdx;
                              return (
                                <div
                                  key={stage}
                                  style={{
                                    flex: 1,
                                    height: '3px',
                                    borderRadius: '2px',
                                    background: isCompleted
                                      ? '#c45c5c'
                                      : isCurrent
                                      ? '#e07a7a'
                                      : '#e5e7eb',
                                    transition: 'background 0.3s ease',
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Action button */}
                        {section.title === 'Action Required' && (
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDrawer(task);
                            }}
                          >
                            Take Action <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </main>
    </>
  );
}
