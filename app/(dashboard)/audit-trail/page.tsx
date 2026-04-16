'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Topbar from '@/components/layout/topbar';
import {
  Search,
  Download,
  ChevronDown,
  ShieldAlert,
  RefreshCw,
  FileText,
  UserCheck,
  Handshake,
  ShieldCheck,
  Trophy,
  FlaskConical,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string): { label: string; full: string } {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const full = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + timeStr;

  let label: string;
  if (diffMins < 1) label = 'Just now';
  else if (diffMins < 60) label = `${diffMins}m ago`;
  else if (diffHours < 24) label = `${diffHours}h ago · ${timeStr}`;
  else if (diffDays === 1) label = `Yesterday · ${timeStr}`;
  else if (diffDays < 7) label = `${diffDays} days ago · ${timeStr}`;
  else label = full;

  return { label, full };
}

const ACTION_ICON: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  assign:   { icon: UserCheck,   color: '#7c3aed', bg: '#ede9fe' },
  submit:   { icon: FileText,    color: '#2563eb', bg: '#dbeafe' },
  accept:   { icon: Handshake,   color: '#059669', bg: '#d1fae5' },
  approve:  { icon: ShieldCheck, color: '#16a34a', bg: '#f0fdf4' },
  reject:   { icon: AlertCircle, color: '#dc2626', bg: '#fef2f2' },
  complete: { icon: Trophy,      color: '#d97706', bg: '#fef3c7' },
  upload:   { icon: FileText,    color: '#0284c7', bg: '#e0f2fe' },
  hold:     { icon: AlertCircle, color: '#ea580c', bg: '#fff7ed' },
};

function resolveActionIcon(action: string) {
  const lower = action.toLowerCase();
  for (const [key, val] of Object.entries(ACTION_ICON)) {
    if (lower.includes(key)) return val;
  }
  return { icon: FlaskConical, color: '#6b7280', bg: '#f3f4f6' };
}

// ─── Page ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function AuditTrailPage() {
  const router = useRouter();
  const supabase = createClient();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // ── Auth guard ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const role = user?.user_metadata?.role;
      if (role !== 'super_admin') {
        router.replace('/dashboard');
      } else {
        setAuthorized(true);
      }
    });
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      let query = supabase
        .from('audit_log')
        .select('*, experiments(name, grade, sl_no)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(reset ? 0 : offset, reset ? PAGE_SIZE - 1 : offset + PAGE_SIZE - 1);

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo)   query = query.lte('created_at', dateTo + 'T23:59:59');
      if (actionFilter) query = query.ilike('action', `%${actionFilter}%`);

      const { data, error, count } = await query;
      if (error) throw error;

      const filtered = search.trim()
        ? (data || []).filter((log: any) => {
            const q = search.toLowerCase();
            return (
              log.experiments?.name?.toLowerCase().includes(q) ||
              log.action?.toLowerCase().includes(q) ||
              log.performed_by_name?.toLowerCase().includes(q)
            );
          })
        : (data || []);

      if (reset) {
        setLogs(filtered);
        setOffset(PAGE_SIZE);
      } else {
        setLogs(prev => [...prev, ...filtered]);
        setOffset(prev => prev + PAGE_SIZE);
      }
      setTotal(count || 0);
    } catch (err) {
      console.error('Audit log fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, dateFrom, dateTo, actionFilter, offset]);

  useEffect(() => {
    if (authorized) fetchLogs(true);
  }, [authorized, search, dateFrom, dateTo, actionFilter]);

  // ── CSV Export ────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ['#', 'Experiment', 'Grade', 'Action', 'Performed By', 'Timestamp', 'Details'],
      ...logs.map((log, i) => [
        i + 1,
        log.experiments?.name || log.experiment_id,
        log.experiments?.grade || '',
        log.action || '',
        log.performed_by_name || log.performed_by || '',
        new Date(log.created_at).toLocaleString('en-IN'),
        log.metadata ? (typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)) : '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Jigyasu_AuditTrail_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ── Loading / Auth states ─────────────────────────────────────────
  if (authorized === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-[#c45c5c]/20 border-t-[#c45c5c] rounded-full animate-spin" />
      </div>
    );
  }

  const hasMore = logs.length < total;

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Admin' }, { label: 'Audit Trail' }]} />

      <main className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        {/* Header */}
        <div className="page-header-row flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
              <ShieldAlert size={20} style={{ color: '#c45c5c' }} />
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e' }}>Audit Trail</h1>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              Complete log of all actions across the system.{' '}
              <span style={{ fontWeight: 500 }}>{total.toLocaleString()} total events</span>
              {' · '}
              <span style={{ fontSize: '11px', background: '#fef2f2', color: '#c45c5c', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                Super Admin Only
              </span>
            </p>
          </div>
          <div className="dm-header-actions flex items-center gap-2">
            <button
              onClick={() => fetchLogs(true)}
              className="btn btn-outline"
              style={{ fontSize: '13px' }}
              title="Refresh"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="btn btn-outline"
              style={{ fontSize: '13px' }}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div
          className="card filter-bar"
          style={{ padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
        >
          {/* Search */}
          <div
            className="flex items-center filter-search"
            style={{ background: '#f3f4f6', borderRadius: '8px', padding: '0 12px', height: '36px', flex: '1 1 200px', maxWidth: '320px', minWidth: '180px' }}
          >
            <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search experiment, action, person…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#374151', width: '100%', padding: '0 8px', fontFamily: "'Inter', sans-serif" }}
            />
          </div>

          {/* Action filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              style={{ appearance: 'none', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 30px 8px 12px', fontSize: '13px', color: actionFilter ? '#374151' : '#6b7280', cursor: 'pointer', fontFamily: "'Inter', sans-serif", outline: 'none' }}
            >
              <option value="">All Actions</option>
              {['Assign', 'Submit', 'Accept', 'Reject', 'Approve', 'Upload', 'Complete', 'Hold'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }} />
          </div>

          {/* Date From */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' }}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: "'Inter', sans-serif", color: '#374151' }}
            />
          </div>

          {/* Date To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' }}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: "'Inter', sans-serif", color: '#374151' }}
            />
          </div>

          {/* Clear filters */}
          {(search || dateFrom || dateTo || actionFilter) && (
            <button
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setActionFilter(''); }}
              style={{ fontSize: '12px', color: '#c45c5c', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <div className="w-10 h-10 border-4 border-[#c45c5c]/20 border-t-[#c45c5c] rounded-full animate-spin" />
              <p className="text-sm text-gray-400 font-medium">Loading audit logs…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 gap-3">
              <ShieldAlert size={36} style={{ color: '#d1d5db' }} />
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>No audit events found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    {['#', 'Experiment', 'Action', 'Performed By', 'When', 'Details'].map(col => (
                      <th
                        key={col}
                        style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => {
                    const { label: timeLabel, full: timeFull } = formatRelative(log.created_at);
                    const actionStyle = resolveActionIcon(log.action || '');
                    const ActionIcon = actionStyle.icon;
                    const isExpanded = expandedId === log.id;
                    const hasMetadata = log.metadata && Object.keys(
                      typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
                    ).length > 0;

                    return (
                      <>
                        <tr
                          key={log.id}
                          onClick={() => hasMetadata && setExpandedId(isExpanded ? null : log.id)}
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6',
                            transition: 'background 0.15s ease',
                            cursor: hasMetadata ? 'pointer' : 'default',
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = '#f9fafb'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          {/* # */}
                          <td style={{ padding: '14px 16px', fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>
                            {idx + 1}
                          </td>

                          {/* Experiment */}
                          <td style={{ padding: '14px 16px' }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.experiments?.name || <span style={{ color: '#9ca3af' }}>Unknown</span>}
                            </p>
                            {log.experiments?.grade && (
                              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                                Grade {log.experiments.grade} · #{log.experiments.sl_no}
                              </p>
                            )}
                          </td>

                          {/* Action */}
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: actionStyle.bg,
                                color: actionStyle.color,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <ActionIcon size={12} />
                              {log.action}
                            </span>
                          </td>

                          {/* Performed By */}
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {log.performed_by_name || (
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>Unknown</span>
                            )}
                          </td>

                          {/* When */}
                          <td style={{ padding: '14px 16px' }}>
                            <p
                              style={{ fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}
                              title={timeFull}
                            >
                              {timeLabel}
                            </p>
                            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{timeFull}</p>
                          </td>

                          {/* Details expand toggle */}
                          <td style={{ padding: '14px 16px' }}>
                            {hasMetadata ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c45c5c', fontSize: '12px', fontWeight: 600 }}>
                                <ChevronRight
                                  size={14}
                                  style={{ transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                                />
                                {isExpanded ? 'Hide' : 'View'}
                              </div>
                            ) : (
                              <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded metadata row */}
                        {isExpanded && hasMetadata && (
                          <tr key={`${log.id}-detail`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td />
                            <td colSpan={5} style={{ padding: '0 16px 14px' }}>
                              <div
                                style={{
                                  background: '#f8faff',
                                  border: '1px solid #dbeafe',
                                  borderRadius: '8px',
                                  padding: '12px 14px',
                                  fontSize: '12px',
                                  color: '#374151',
                                  fontFamily: 'monospace',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-all',
                                  maxHeight: '200px',
                                  overflowY: 'auto',
                                }}
                              >
                                {typeof log.metadata === 'string'
                                  ? log.metadata
                                  : JSON.stringify(log.metadata, null, 2)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Load more */}
          {!loading && hasMore && (
            <div style={{ padding: '16px', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
              <button
                onClick={() => fetchLogs(false)}
                disabled={loadingMore}
                className="btn btn-outline"
                style={{ fontSize: '13px', minWidth: '160px' }}
              >
                {loadingMore ? (
                  <div className="w-4 h-4 border-2 border-[#c45c5c]/20 border-t-[#c45c5c] rounded-full animate-spin" />
                ) : (
                  `Load more · ${total - logs.length} remaining`
                )}
              </button>
            </div>
          )}

          {/* Footer count */}
          {!loading && logs.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                Showing <strong>{logs.length}</strong> of <strong>{total}</strong> events
              </p>
              <p style={{ fontSize: '11px', color: '#d1d5db' }}>Visible to Super Admin only</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
