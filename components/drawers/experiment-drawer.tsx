'use client';

import { useEffect, useState, useRef } from 'react';
import { useDrawer } from '@/hooks/use-drawer';
import { useModal } from '@/hooks/use-modal';
import { X, Image as ImageIcon, Activity, Upload, Loader2, ExternalLink } from 'lucide-react';
import { STAGE_COLORS, PRIORITY_COLORS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
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
  'Not Assigned': 'Assign for Functional Testing',
  'Functional Testing': 'Submit Result',
  'Solution Assignment': 'Assign Solution',
  'Solution In Progress': 'Submit Handover',
  'Design Team Acceptance': 'Accept / Reject',
  'Design In Progress': 'Update Design',
  'Design Approval': 'Review & Approve',
  'File Upload': 'Upload Files',
  'Procurement': 'Mark as Checked',
};

// Read-only info row
const InfoRow = ({ label, value, isLink = false }: { label: string; value: any; isLink?: boolean }) => {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>{label}</p>
      {isLink
        ? <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#c45c5c', textDecoration: 'underline', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ExternalLink size={11} /> {String(value).length > 40 ? String(value).slice(0, 40) + '…' : value}
          </a>
        : <p style={{ fontSize: '13px', color: '#1a1a2e', fontWeight: 500 }}>{value}</p>}
    </div>
  );
};

export default function ExperimentDrawer() {
  const { isOpen, data, onClose } = useDrawer();
  const { onOpen: openModal } = useModal();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('');

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserRole(user?.user_metadata?.role || '');
    });
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data?.id) return;
    try {
      setIsUploading(true);
      const ext = file.name.split('.').pop();
      const path = `${data.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('experiment-images').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pubData } = supabase.storage.from('experiment-images').getPublicUrl(path);
      await supabase.from('experiments').update({ image_url: pubData.publicUrl }).eq('id', data.id);
      toast.success('Image uploaded!');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const stage = data?.stage || 'Not Assigned';
  const currentStageIdx = STAGES_ORDER.indexOf(stage);
  const canManage = currentUserRole === 'admin' || currentUserRole === 'super_admin';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[540px] max-w-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out drawer-panel ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>{data?.name || 'Experiment Details'}</h2>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>Grade {data?.grade || 'N/A'}</p>
            </div>
            <button onClick={onClose} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <X size={20} />
            </button>
          </div>

          {/* Stage + Priority badges */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: STAGE_COLORS[stage]?.bg || '#f3f4f6', color: STAGE_COLORS[stage]?.text || '#6b7280' }}>
              {stage}
            </span>
            {data?.priority && (
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: PRIORITY_COLORS[data.priority]?.bg || '#f3f4f6', color: PRIORITY_COLORS[data.priority]?.text || '#6b7280' }}>
                {data.priority}
              </span>
            )}
            {data?.on_hold && (
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: '#fffbeb', color: '#92400e' }}>
                ⏸ On Hold
              </span>
            )}
            {data?.deadline && (
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: '#f3f4f6', color: '#6b7280' }}>
                📅 {data.deadline}
              </span>
            )}
          </div>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Experiment Image */}
          <div style={{ marginBottom: '20px', position: 'relative' }} className="group">
            {data?.image_url ? (
              <div style={{ position: 'relative' }}>
                <img src={data.image_url} alt={data?.name} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px' }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ position: 'absolute', bottom: '10px', right: '10px', padding: '6px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                  title="Change image"
                >
                  <Upload size={16} style={{ color: '#374151' }} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', height: '100px', background: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '6px' }}
              >
                {isUploading ? <Loader2 size={24} style={{ color: '#c45c5c', animation: 'spin 1s linear infinite' }} /> : <ImageIcon size={24} style={{ color: '#d1d5db' }} />}
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>{isUploading ? 'Uploading…' : 'Click to add experiment image'}</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
          </div>

          {/* ─── All Stage Data — Read Only ─────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Stage 1: FT */}
            {(data?.tester || data?.ft_result) && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#c45c5c', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>① Functional Testing</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <InfoRow label="Assigned Tester" value={data?.tester} />
                  <InfoRow label="FT Result" value={data?.ft_result} />
                  {data?.ft_remarks && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="FT Remarks" value={data?.ft_remarks} /></div>}
                  {data?.deadline && <InfoRow label="Deadline" value={data?.deadline} />}
                </div>
              </div>
            )}

            {/* Stage 2: Solution */}
            {data?.solution_assignee && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>② Solution</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <InfoRow label="Solution Assignee" value={data?.solution_assignee} />
                  <InfoRow label="Physical Model" value={data?.handover_physical_model ? '✓ Done' : null} />
                  <InfoRow label="Engineering Data" value={data?.handover_engineering_data ? '✓ Done' : null} />
                  <InfoRow label="KT" value={data?.handover_kt ? '✓ Done' : null} />
                  {data?.solution_remarks && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="Remarks" value={data?.solution_remarks} /></div>}
                  {data?.on_hold && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="On Hold Reason" value={data?.on_hold_remarks} /></div>}
                </div>
              </div>
            )}

            {/* Stage 3: Design */}
            {data?.design_assignee && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>③ Design</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <InfoRow label="Designer" value={data?.design_assignee} />
                  <InfoRow label="Design Deadline" value={data?.design_deadline} />
                  {data?.design_files_link && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="Design Files" value={data?.design_files_link} isLink /></div>}
                  {data?.design_remarks && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="Designer Remarks" value={data?.design_remarks} /></div>}
                  {data?.biswa_approval && <InfoRow label="Approval Status" value={data?.biswa_approval} />}
                  {data?.biswa_comments && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="Review Comments" value={data?.biswa_comments} /></div>}
                  {data?.acceptance_remarks && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="Acceptance Remarks" value={data?.acceptance_remarks} /></div>}
                </div>
              </div>
            )}

            {/* Stage 4: File Upload / Procurement */}
            {(data?.folder_link || data?.procurement_status === 'Checked') && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>④ File Upload & Procurement</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  {data?.folder_link && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="Upload Folder" value={data?.folder_link} isLink /></div>}
                  {data?.additional_link && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="Additional Link" value={data?.additional_link} isLink /></div>}
                  {data?.upload_remarks && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="Upload Remarks" value={data?.upload_remarks} /></div>}
                  <InfoRow label="Procurement Status" value={data?.procurement_status} />
                  {data?.procurement_verified_by_name && <InfoRow label="Verified By" value={data?.procurement_verified_by_name} />}
                  {data?.procurement_notes && <div style={{ gridColumn: '1 / -1' }}><InfoRow label="Procurement Notes" value={data?.procurement_notes} /></div>}
                </div>
              </div>
            )}

            {/* Pipeline progress */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Activity size={14} style={{ color: '#9ca3af' }} />
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>Pipeline Progress</p>
              </div>
              <div style={{ position: 'relative', borderLeft: '2px solid #e5e7eb', marginLeft: '8px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {STAGES_ORDER.map((s, idx) => {
                  const isDone = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;
                  return (
                    <div key={s} style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: '-27px', top: '2px',
                        width: '10px', height: '10px', borderRadius: '50%',
                        border: '2px solid white',
                        background: isDone ? '#16a34a' : isCurrent ? '#c45c5c' : '#d1d5db',
                      }} />
                      <p style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#1a1a2e' : isDone ? '#16a34a' : '#9ca3af' }}>
                        {s} {isDone && '✓'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stage !== 'Completed' && (
            <button
              onClick={() => { onClose(); openModal('workflow', data); }}
              style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', background: '#c45c5c', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}
              onMouseOver={e => (e.currentTarget.style.background = '#a34a4a')}
              onMouseOut={e => (e.currentTarget.style.background = '#c45c5c')}
            >
              {STAGE_ACTION_LABEL[stage] || 'Manage Stage'} →
            </button>
          )}
          <button onClick={onClose} style={{ width: '100%', padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'Inter',sans-serif" }}>
            Close Panel
          </button>
        </div>
      </div>
    </>
  );
}
