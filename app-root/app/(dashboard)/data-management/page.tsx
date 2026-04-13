'use client';

import { useState, useEffect } from 'react';
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
  Image as ImageIcon
} from 'lucide-react';
import { STAGE_COLORS, PRIORITY_COLORS } from '@/lib/constants';
import { useModal } from '@/hooks/use-modal';
import { useDrawer } from '@/hooks/use-drawer';
import * as XLSX from 'xlsx';

const STAGES_ORDER = [
  'Not Assigned',
  'Functional Testing',
  'Solution Assignment',
  'Handover',
  'Design In Progress',
  'Design Approval',
  'File Upload',
  'Procurement',
  'Completed',
];

export default function DataManagementPage() {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchValue, setSearchValue] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [loading, setLoading] = useState(true);
  
  const { onOpen: openModal } = useModal();
  const { onOpen: openDrawer } = useDrawer();

  const [experiments, setExperiments] = useState<any[]>([]);
  const supabase = createClient();

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

  const handleExport = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dataToExport = filteredExperiments.map(exp => ({
      'SL No': exp.sl_no,
      'Experiment Name': exp.name,
      'Grade': exp.grade,
      'Stage': exp.stage,
      'Priority': exp.priority,
      'Deadline': exp.deadline || 'N/A',
      'Tester': exp.tester || 'N/A',
      'Solution Assignee': exp.sa || 'N/A',
      'FT Result': exp.ft_result || 'N/A',
      'Created At': exp.created_at
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Experiments');
    XLSX.writeFile(wb, `Jigyasu_Experiments_${timestamp}.xlsx`);
  };

  const filteredExperiments = experiments.filter((exp) => {
    if (searchValue && !exp.name.toLowerCase().includes(searchValue.toLowerCase())) return false;
    if (selectedStage && exp.stage !== selectedStage) return false;
    if (selectedGrade && exp.grade !== selectedGrade) return false;
    if (selectedPriority && exp.priority !== selectedPriority) return false;
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
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
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
          <div className="flex items-center gap-2">
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
          className="card"
          style={{
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Search */}
            <div
              className="flex items-center"
              style={{
                background: '#f3f4f6',
                borderRadius: '8px',
                padding: '0 12px',
                height: '36px',
                width: '250px',
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
          <div className="flex items-center gap-1" style={{ background: '#f3f4f6', borderRadius: '8px', padding: '2px' }}>
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
              <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                                <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/experiments/${exp.image_path}`} alt="Thumb" className="w-9 h-9 rounded object-cover" />
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
                              {exp.tester || exp.sa || '—'}
                            </td>
                            <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDrawer(exp);
                                  }}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb',
                                    background: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                                  onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
                                  title="View Details"
                                >
                                  <Eye size={16} style={{ color: '#6b7280' }} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDrawer(exp); // In reality we could open a context menu here
                                  }}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb',
                                    background: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                                  onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
                                  title="More Actions"
                                >
                                  <MoreHorizontal size={16} style={{ color: '#6b7280' }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
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
                            </div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-[#c45c5c] transition-colors line-clamp-2">
                              {exp.name}
                            </h4>
                            <p className="text-xs text-gray-500 mb-3">Grade {exp.grade}</p>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <span className="text-xs text-gray-600 truncate">
                                {exp.tester || exp.sa || 'Unassigned'}
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
