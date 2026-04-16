'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Topbar from '@/components/layout/topbar';
import {
  Search,
  Filter,
  Download,
  LayoutGrid,
  List,
  ChevronDown,
  MoreHorizontal,
  Eye,
  ArrowUpDown,
  Plus,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { STAGE_COLORS, PRIORITY_COLORS } from '@/lib/constants';
import { useModal } from '@/hooks/use-modal';
import { useDrawer } from '@/hooks/use-drawer';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const STAGES_ORDER = [
  'Not Assigned',
  'Functional Testing',
  'Solution Assignment',
  'Solution In Progress',
  'Design Team Acceptance',
  'Design In Progress',
  'Design Approval',
  'File Upload',
  'Procurement',
  'Completed',
];

const STAGE_ACTION_LABEL: Record<string, string> = {
  'Not Assigned': 'Assign',
  'Functional Testing': 'Submit Result',
  'Solution Assignment': 'Assign Solution',
  'Solution In Progress': 'Submit Handover',
  'Design Team Acceptance': 'Accept / Reject',
  'Design In Progress': 'Update Design',
  'Design Approval': 'Review',
  'File Upload': 'Upload Files',
  'Procurement': 'Verify',
  'Completed': 'View History',
};

export default function DataManagementPage() {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchValue, setSearchValue] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  
  const { onOpen: openModal } = useModal();
  const { onOpen: openDrawer } = useDrawer();

  const [experiments, setExperiments] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const supabase = createClient();

  // Pre-set stage filter from URL (e.g. from Pipeline Explore button)
  useEffect(() => {
    const stage = searchParams.get('stage');
    if (stage) setSelectedStage(stage);
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const role = user?.user_metadata?.role;
      setIsSuperAdmin(role === 'super_admin' || role === 'admin');
    });
  }, []);

  useEffect(() => {
    async function fetchExperiments() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('experiments')
          .select('*')
          .order('sl_no', { ascending: true });

        if (error) throw error;
        setExperiments(data || []);
      } catch (err) {
        console.error('Error fetching experiments:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchExperiments();
  }, []);

  const handleDelete = async (expId: string, expName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${expName}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('experiments').delete().eq('id', expId);
    if (error) { toast.error('Failed to delete: ' + error.message); return; }
    setExperiments(prev => prev.filter(ex => ex.id !== expId));
    toast.success('Experiment deleted.');
  };

  const handleExport = async () => {
    try {
      toast.info('Preparing export…');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // ── Sheet 1: Full Experiment Details ─────────────────────────────
      const dataToExport = filteredExperiments.map(exp => ({
        // ── Identifiers ──────────────────────────────────────────────
        'SL No': exp.sl_no ?? '',
        'Experiment ID': exp.id ?? '',
        'Experiment Name': exp.name ?? '',
        'Grade': exp.grade ?? '',
        'Priority': exp.priority ?? '',
        'Current Stage': exp.stage ?? '',
        'On Hold': exp.on_hold ? 'Yes' : 'No',
        'On Hold Remarks': exp.on_hold_remarks ?? '',

        // ── Stage 1 – Not Assigned ────────────────────────────────────
        'Assigned By': exp.assigned_by ?? '',
        'Assignment Date': exp.deadline ?? '',

        // ── Stage 2 – Functional Testing ─────────────────────────────
        'Functional Tester': exp.tester ?? '',
        'FT Result': exp.ft_result ?? '',
        'FT Remarks': exp.ft_remarks ?? '',
        'FT Submitted At': exp.ft_submitted_at ? new Date(exp.ft_submitted_at).toLocaleString() : '',

        // ── Stage 3 – Solution Assignment ────────────────────────────
        'Solution Assignee': exp.solution_assignee ?? '',
        'Solution Assigned At': exp.solution_assigned_at ? new Date(exp.solution_assigned_at).toLocaleString() : '',

        // ── Stage 4 – Solution In Progress / Handover ────────────────
        'Handover Physical Model': exp.handover_physical_model ? 'Yes' : (exp.solution_assignee ? 'No' : ''),
        'Handover Engineering Data': exp.handover_engineering_data ? 'Yes' : (exp.solution_assignee ? 'No' : ''),
        'Handover KT': exp.handover_kt ? 'Yes' : (exp.solution_assignee ? 'No' : ''),
        'Solution Remarks': exp.solution_remarks ?? '',
        'Handover Given At': exp.handover_given_at ? new Date(exp.handover_given_at).toLocaleString() : '',

        // ── Stage 5 – Design Team Acceptance ─────────────────────────
        'Designer': exp.design_assignee ?? '',
        'Design Accepted At': exp.design_accepted_at ? new Date(exp.design_accepted_at).toLocaleString() : '',
        'Acceptance Remarks': exp.acceptance_remarks ?? '',
        'Rejection Remarks (Design Acceptance)': exp.rejection_remarks ?? '',

        // ── Stage 6 – Design In Progress ─────────────────────────────
        'Design Deadline': exp.design_deadline ?? '',
        'Design Files Link': exp.design_files_link ?? '',
        'Designer Remarks': exp.design_remarks ?? '',
        'Design Submitted At': exp.design_submitted_at ? new Date(exp.design_submitted_at).toLocaleString() : '',

        // ── Stage 7 – Design Approval ─────────────────────────────────
        'Approval Decision': exp.biswa_approval ?? '',
        'Approved By': exp.approval_by ?? '',
        'Approval Remarks': exp.approval_remarks ?? '',
        'Rejection Comments (Design Approval)': exp.biswa_comments ?? '',
        'Design Reviewed At': exp.biswa_reviewed_at ? new Date(exp.biswa_reviewed_at).toLocaleString() : '',

        // ── Stage 8 – File Upload ─────────────────────────────────────
        'Upload Folder Link': exp.folder_link ?? '',
        'Additional Link': exp.additional_link ?? '',
        'Upload Remarks': exp.upload_remarks ?? '',
        'Files Uploaded At': exp.file_uploaded_at ? new Date(exp.file_uploaded_at).toLocaleString() : '',

        // ── Stage 9 – Procurement ─────────────────────────────────────
        'Procurement Status': exp.procurement_status ?? '',
        'Procurement Verified By': exp.procurement_verified_by_name ?? '',
        'Procurement Notes': exp.procurement_notes ?? '',
        'Procurement Checked At': exp.procurement_checked_at ? new Date(exp.procurement_checked_at).toLocaleString() : '',

        // ── Stage 10 – Completed ──────────────────────────────────────
        'Completed At': exp.completed_at ? new Date(exp.completed_at).toLocaleString() : '',

        // ── Timestamps ───────────────────────────────────────────────
        'Created At': exp.created_at ? new Date(exp.created_at).toLocaleString() : '',
        'Last Updated At': exp.updated_at ? new Date(exp.updated_at).toLocaleString() : '',
      }));

      const ws1 = XLSX.utils.json_to_sheet(dataToExport);
      // Auto-fit column widths
      const cols1 = Object.keys(dataToExport[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 20) }));
      ws1['!cols'] = cols1;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Experiment Details');

      // ── Sheet 2: Audit Trail ──────────────────────────────────────────
      const expIds = filteredExperiments.map(e => e.id);
      if (expIds.length > 0) {
        const { data: auditData } = await supabase
          .from('audit_log')
          .select('experiment_id, action, performed_by, performed_by_name, created_at, metadata')
          .in('experiment_id', expIds)
          .order('created_at', { ascending: true });

        if (auditData && auditData.length > 0) {
          // Create a lookup from experiment ID → name
          const idToName: Record<string, string> = {};
          filteredExperiments.forEach(e => { idToName[e.id] = `${e.sl_no}. ${e.name} (Grade ${e.grade})`; });

          const auditRows = auditData.map(log => ({
            'Experiment': idToName[log.experiment_id] ?? log.experiment_id,
            'Action': log.action ?? '',
            'Performed By': log.performed_by_name ?? log.performed_by ?? '',
            'Timestamp': log.created_at ? new Date(log.created_at).toLocaleString() : '',
            'Details': log.metadata ? (typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)) : '',
          }));

          const ws2 = XLSX.utils.json_to_sheet(auditRows);
          ws2['!cols'] = [{ wch: 40 }, { wch: 35 }, { wch: 25 }, { wch: 22 }, { wch: 60 }];
          XLSX.utils.book_append_sheet(wb, ws2, 'Audit Trail');
        }
      }

      XLSX.writeFile(wb, `Jigyasu_Experiments_${timestamp}.xlsx`);
      toast.success('Export ready — check your downloads!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed. Please try again.');
    }
  };

  // Resolves the current assignee name for an experiment, mirroring the table display logic
  const resolveAssignee = (exp: any): string => {
    const s = exp.stage;
    if (s === 'Not Assigned') return '';
    if (s === 'Functional Testing') return exp.tester || '';
    if (s === 'Solution Assignment') return '';
    if (s === 'Solution In Progress') return exp.solution_assignee || '';
    if (s === 'Design Team Acceptance') return exp.design_assignee || '';
    if (s === 'Design In Progress') return exp.design_assignee || '';
    if (s === 'Design Approval') return exp.design_assignee || '';
    if (s === 'File Upload') return exp.design_assignee || '';
    if (s === 'Procurement') return exp.procurement_verified_by_name || '';
    if (s === 'Completed') return exp.procurement_verified_by_name || exp.design_assignee || exp.tester || '';
    return exp.tester || '';
  };

  // Unique, sorted assignee names derived from loaded data — no extra API calls
  const assigneeOptions = Array.from(
    new Set(experiments.map(resolveAssignee).filter(Boolean))
  ).sort();

  const filteredExperiments = experiments.filter((exp) => {
    if (searchValue && !exp.name.toLowerCase().includes(searchValue.toLowerCase())) return false;
    if (selectedStage && exp.stage !== selectedStage) return false;
    if (selectedGrade && exp.grade !== selectedGrade) return false;
    if (selectedPriority && exp.priority !== selectedPriority) return false;
    if (selectedAssignee && resolveAssignee(exp) !== selectedAssignee) return false;
    return true;
  });

  return (
    <>
      <Topbar
        breadcrumbs={[
          { label: 'Engineering', href: '#' },
          { label: 'Data Management' },
        ]}
      />

      <main className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        {/* Header */}
        <div className="page-header-row flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>
              Data Management
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              Manage experiments, track workflow progress, and assign tasks.{' '}
              <span style={{ fontWeight: 500 }}>
                {experiments.length} total experiments
              </span>
            </p>
          </div>
          <div className="dm-header-actions flex items-center gap-2">
            <button onClick={handleExport} className="btn btn-outline" style={{ fontSize: '13px' }}>
              <Download size={15} />
              Export
            </button>
            <button 
              onClick={() => openModal('add_experiment')}
              className="btn" 
              style={{ fontSize: '13px', background: '#c45c5c', color: 'white', border: 'none' }}
            >
              <Plus size={15} />
              Add Experiment
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div
          className="card filter-bar"
          style={{
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap', flex: 1 }}>
            {/* Search */}
            <div
              className="flex items-center filter-search"
              style={{
                background: '#f3f4f6',
                borderRadius: '8px',
                padding: '0 12px',
                height: '36px',
                width: '250px',
                minWidth: '180px',
                flex: '1 1 180px',
                maxWidth: '300px',
              }}
            >
              <Search size={15} style={{ color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search experiments..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#374151',
                  width: '100%',
                  padding: '0 8px',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>

            {/* Filter dropdowns */}
            {[
              {
                label: 'Stage',
                value: selectedStage,
                onChange: setSelectedStage,
                options: ['', 'Not Assigned', 'Functional Testing', 'Solution Assignment', 'Handover', 'Design In Progress', 'Design Approval', 'File Upload', 'Procurement', 'Completed'],
              },
              {
                label: 'Grade',
                value: selectedGrade,
                onChange: setSelectedGrade,
                options: ['', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'],
              },
              {
                label: 'Priority',
                value: selectedPriority,
                onChange: setSelectedPriority,
                options: ['', 'Low', 'Medium', 'High', 'Critical'],
              },
              {
                label: 'Assignee',
                value: selectedAssignee,
                onChange: setSelectedAssignee,
                options: ['', ...assigneeOptions],
              },
            ].map((filter) => (
              <div key={filter.label} style={{ position: 'relative' }}>
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  style={{
                    appearance: 'none',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 30px 8px 12px',
                    fontSize: '13px',
                    color: filter.value ? '#374151' : '#6b7280',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                  }}
                >
                  <option value="">{filter.label}</option>
                  {filter.options.filter(Boolean).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#9ca3af',
                  }}
                />
              </div>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 view-toggle" style={{ background: '#f3f4f6', borderRadius: '8px', padding: '2px', flexShrink: 0 }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'table' ? 'white' : 'transparent',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                color: viewMode === 'table' ? '#374151' : '#9ca3af',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'kanban' ? 'white' : 'transparent',
                boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                color: viewMode === 'kanban' ? '#374151' : '#9ca3af',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4 card">
            <div className="w-10 h-10 border-4 border-[#c45c5c]/20 border-t-[#c45c5c] rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Fetching experiments...</p>
          </div>
        ) : (
          <>
            {viewMode === 'table' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                      <th style={{ padding: '12px 16px', width: '40px' }}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-[#c45c5c] focus:ring-[#c45c5c]"
                        />
                      </th>
                      {['SL No', 'Image', 'Experiment Name', 'Grade', 'Stage', 'Priority', 'Deadline', 'Assignee', 'Actions'].map((col) => (
                        <th
                          key={col}
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            whiteSpace: col === 'Experiment Name' ? 'normal' : 'nowrap',
                          }}
                        >
                          <div className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
                            {col}
                            {!['Actions', 'Image'].includes(col) && (
                              <ArrowUpDown size={12} style={{ color: '#d1d5db' }} />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExperiments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <List size={32} style={{ color: '#d1d5db' }} />
                            <p>No experiments found. Ensure data is synced from Google Sheets.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredExperiments.map((exp) => {
                        const stageColor = STAGE_COLORS[exp.stage] || { bg: '#f3f4f6', text: '#6b7280' };
                        const prioColor = PRIORITY_COLORS[exp.priority] || { bg: '#f3f4f6', text: '#6b7280' };
                        const isOverdue = exp.deadline && new Date(exp.deadline) < new Date() && exp.stage !== 'Completed';
                        return (
                          <tr
                            key={exp.id}
                            onClick={() => openDrawer(exp)}
                            style={{
                              borderBottom: '1px solid #f3f4f6',
                              transition: 'background 0.15s ease',
                              cursor: 'pointer',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-[#c45c5c] focus:ring-[#c45c5c]"
                              />
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                              {exp.sl_no}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {exp.image_path ? (
                                <img 
                                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/experiment-images/${exp.image_path}`} 
                                  alt="Thumb" 
                                  className="w-9 h-9 rounded object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-9 h-9 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                                  <ImageIcon size={16} />
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <p
                                className="truncate max-w-[200px]"
                                style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}
                                title={exp.name}
                              >
                                {exp.name}
                              </p>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span className="badge badge-neutral">{exp.grade}</span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                className="badge shrink-0"
                                style={{ background: stageColor.bg, color: stageColor.text }}
                              >
                                {exp.stage}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                className="badge shrink-0"
                                style={{ background: prioColor.bg, color: prioColor.text, whiteSpace: 'nowrap' }}
                              >
                                {exp.priority}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '14px 16px',
                                fontSize: '13px',
                                color: isOverdue ? '#dc2626' : '#6b7280',
                                fontWeight: isOverdue ? 600 : 400,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {exp.deadline || '—'}
                            </td>
                            <td
                              style={{ padding: '14px 16px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}
                            >
                              {(() => {
                                const s = exp.stage;
                                if (s === 'Not Assigned') return '—';
                                if (s === 'Functional Testing') return exp.tester || '—';
                                if (s === 'Solution Assignment') return 'Pending Assignment';
                                if (s === 'Solution In Progress') return exp.solution_assignee || '—';
                                if (s === 'Design Team Acceptance') return exp.design_assignee || 'Pending';
                                if (s === 'Design In Progress') return exp.design_assignee || '—';
                                if (s === 'Design Approval') return exp.design_assignee || '—';
                                if (s === 'File Upload') return exp.design_assignee || '—';
                                if (s === 'Procurement') return exp.procurement_verified_by_name || 'Procurement Team';
                                if (s === 'Completed') return exp.procurement_verified_by_name || exp.design_assignee || exp.tester || '—';
                                return exp.tester || '—';
                              })()}
                            </td>
                            <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                              <div className="flex items-center gap-2">
                                {/* Stage action button */}
                                {exp.stage !== 'Completed' ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openModal('workflow', exp); }}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid #c45c5c',
                                      background: '#c45c5c',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      fontFamily: "'Inter',sans-serif",
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.background = '#a34a4a')}
                                    onMouseOut={(e) => (e.currentTarget.style.background = '#c45c5c')}
                                    title={STAGE_ACTION_LABEL[exp.stage] || 'Manage'}
                                  >
                                    {STAGE_ACTION_LABEL[exp.stage] || 'Manage'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openModal('workflow', exp); }}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid #86efac',
                                      background: '#f0fdf4',
                                      color: '#16a34a',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      fontFamily: "'Inter',sans-serif",
                                    }}
                                  >
                                    ✓ View
                                  </button>
                                )}
                                {/* Eye / details */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); openDrawer(exp); }}
                                  style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                  onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                                  onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
                                  title="View Details"
                                >
                                  <Eye size={16} style={{ color: '#6b7280' }} />
                                </button>
                                {isSuperAdmin && (
                                  <button
                                    onClick={(e) => handleDelete(exp.id, exp.name, e)}
                                    style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                    title="Delete Experiment"
                                  >
                                    <Trash2 size={14} style={{ color: '#dc2626' }} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                </tbody>
                </table>
                </div>{/* end scroll wrapper */}
              </div>
            )}

            {/* Kanban View */}
            {viewMode === 'kanban' && (
              <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
                {STAGES_ORDER.map((stage) => {
                  const stageExp = filteredExperiments.filter((e) => e.stage === stage);
                  const headerColor = STAGE_COLORS[stage]?.bg || '#f3f4f6';
                  const textColor = STAGE_COLORS[stage]?.text || '#4b5563';

                  return (
                    <div
                      key={stage}
                      className="flex-shrink-0 w-[300px] flex flex-col bg-gray-50 rounded-lg border border-gray-200"
                    >
                      {/* Column Header */}
                      <div
                        className="px-4 py-3 border-b border-gray-200 flex items-center justify-between rounded-t-lg"
                        style={{ background: headerColor }}
                      >
                        <h3 style={{ fontSize: '13px', fontWeight: 700, color: textColor }}>{stage}</h3>
                        <span
                          className="px-2 py-0.5 bg-white/50 rounded-full text-xs font-semibold"
                          style={{ color: textColor }}
                        >
                          {stageExp.length}
                        </span>
                      </div>

                      {/* Column Body */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {stageExp.map((exp) => (
                          <div
                            key={exp.id}
                            onClick={() => openDrawer(exp)}
                            className="bg-white p-3 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:border-[#c45c5c] hover:shadow-md transition-all group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold text-gray-400">#{exp.sl_no}</span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-[2px] rounded text-[10px] font-bold ${
                                    exp.priority === 'High' || exp.priority === 'Critical'
                                      ? 'bg-red-50 text-red-600'
                                      : exp.priority === 'Medium'
                                      ? 'bg-amber-50 text-amber-600'
                                      : 'bg-green-50 text-green-600'
                                  }`}
                                >
                                  {exp.priority}
                                </span>
                                {isSuperAdmin && (
                                  <button
                                    onClick={(e) => handleDelete(exp.id, exp.name, e)}
                                    title="Delete Experiment"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: '5px',
                                      border: '1px solid #fca5a5',
                                      background: '#fef2f2',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                  >
                                    <Trash2 size={11} style={{ color: '#dc2626' }} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-[#c45c5c] transition-colors line-clamp-2">
                              {exp.name}
                            </h4>
                            <p className="text-xs text-gray-500 mb-3">Grade {exp.grade}</p>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <span className="text-xs text-gray-600 truncate">
                                {exp.stage === 'Not Assigned' ? 'Unassigned' :
                                 exp.stage === 'Functional Testing' ? (exp.tester || 'Unassigned') :
                                 exp.stage === 'Solution Assignment' ? 'Pending' :
                                 (exp.stage === 'Solution In Progress') ? (exp.solution_assignee || 'Unassigned') :
                                 (exp.stage === 'Design Team Acceptance' || exp.stage === 'Design In Progress' || exp.stage === 'Design Approval' || exp.stage === 'File Upload') ? (exp.design_assignee || 'Pending') :
                                 exp.stage === 'Procurement' ? (exp.procurement_verified_by_name || 'Procurement') :
                                 exp.stage === 'Completed' ? (exp.procurement_verified_by_name || exp.design_assignee || exp.tester || '—') :
                                 (exp.tester || 'Unassigned')}
                              </span>
                              {exp.deadline && (
                                <span
                                  className={`text-[10px] font-semibold ${
                                    new Date(exp.deadline) < new Date() ? 'text-red-600' : 'text-gray-400'
                                  }`}
                                >
                                  {new Date(exp.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {stageExp.length === 0 && (
                          <div className="text-center p-4 border-2 border-dashed border-gray-200 rounded-md">
                            <p className="text-xs text-gray-400 font-medium">No experiments</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
