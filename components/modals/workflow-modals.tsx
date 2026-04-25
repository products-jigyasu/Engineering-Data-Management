'use client';

import { useState, useEffect } from 'react';
import { useModal } from '@/hooks/use-modal';
import { toast } from 'sonner';
import { X, LogOut, Loader2, CheckCircle2, XCircle, Download, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';

// ─── Shared helpers ───────────────────────────────────────────────

const S: { [key: string]: React.CSSProperties } = {
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: "'Inter',sans-serif", boxSizing: 'border-box' as const },
  label: { fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' } as React.CSSProperties,
  secBtn: { padding: '10px 16px', border: '1px solid #e5e7eb', borderRadius: '7px', background: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter',sans-serif" } as React.CSSProperties,
};

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  flex: 1, padding: '10px', border: 'none', borderRadius: '7px',
  background: disabled ? '#e5e7eb' : '#c45c5c', color: 'white',
  fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  fontFamily: "'Inter',sans-serif",
});

const ReadField = ({ label, value, isLink = false }: { label: string; value: any; isLink?: boolean }) => {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{label}</p>
      {isLink
        ? <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#c45c5c', textDecoration: 'underline', wordBreak: 'break-all' }}>{String(value).length > 50 ? String(value).slice(0, 50) + '…' : value}</a>
        : <p style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{value}</p>}
    </div>
  );
};

const ExpHeader = ({ data }: { data: any }) => (
  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
    <div>
      <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>EXPERIMENT</p>
      <p style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a2e' }}>{data.name}</p>
    </div>
    <div style={{ textAlign: 'right' }}>
      <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>GRADE</p>
      <p style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a2e' }}>{data.grade}</p>
    </div>
  </div>
);

const WarnBanner = ({ msg }: { msg: string }) => (
  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
    <p style={{ fontSize: '13px', color: '#dc2626' }}>⚠️ {msg}</p>
  </div>
);

// Super Admin Override warning — shown when SA acts on behalf of an assigned user
const SAOverrideBanner = ({ assignedTo }: { assignedTo?: string }) => (
  <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
    <span style={{ fontSize: '18px', lineHeight: 1 }}>🛡️</span>
    <div>
      <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '2px' }}>Acting with Super Admin Privilege</p>
      <p style={{ fontSize: '12px', color: '#b45309' }}>
        You are overriding the assignment{assignedTo ? ` (assigned to: ${assignedTo})` : ''}. This action will be attributed to you and logged in the audit trail.
      </p>
    </div>
  </div>
);

// ─── Stage 1: Not Assigned → Functional Testing ──────────────────

const AssignFTModal = ({ onClose, data, users, updateExperiment, isSubmitting, currentUserRole }: any) => {
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState(data.priority || 'Medium');
  const [deadline, setDeadline] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const testers = users.filter((u: any) => u.role === 'tester' && u.status === 'active');
  const canAct = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAct) { toast.error('Only Admin or Super Admin can assign experiments.'); return; }
    if (deadline && deadline < today) { toast.error('Deadline cannot be a past date.'); return; }
    const sel = users.find((u: any) => u.id === assignee);
    updateExperiment(
      { stage: 'Functional Testing', tester: sel?.name, tester_id: assignee, priority, ...(deadline ? { deadline } : {}) },
      [{ user_id: assignee, title: 'Functional Testing Assignment', message: `You have been assigned Functional Testing for: "${data.name}" (Grade ${data.grade})`, type: 'info' }]
    );
  };

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Assign for Functional Testing</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Not Assigned → Functional Testing</p>
      </div>
      <ExpHeader data={data} />
      {!canAct && <WarnBanner msg="Only Super Admin or Admin can assign experiments for Functional Testing." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={S.label}>Tester Assignee <span style={{ color: '#ef4444' }}>*</span></label>
          <select required disabled={!canAct} value={assignee} onChange={e => setAssignee(e.target.value)} style={{ ...S.input, background: 'white' }}>
            <option value="" disabled>Select active tester…</option>
            {testers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {testers.length === 0 && canAct && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>No active tester users found.</p>}
        </div>
        <div>
          <label style={S.label}>Priority <span style={{ color: '#ef4444' }}>*</span></label>
          <select required disabled={!canAct} value={priority} onChange={e => setPriority(e.target.value)} style={{ ...S.input, background: 'white' }}>
            {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Deadline <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
          <input type="date" min={today} disabled={!canAct} value={deadline} onChange={e => setDeadline(e.target.value)} style={S.input} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
        <button type="submit" disabled={isSubmitting || !assignee || !canAct} style={primaryBtn(isSubmitting || !assignee || !canAct)}>
          {isSubmitting && <Loader2 size={14} className="animate-spin" />} Assign & Notify
        </button>
      </div>
    </form>
  );
};

// ─── Stage 2: Functional Testing → Solution Assignment ───────────

const RecordFTModal = ({ onClose, data, currentUserId, currentUserRole, updateExperiment, isSubmitting, onReassign }: any) => {
  const [result, setResult] = useState(data.ft_result || '');
  const [remarks, setRemarks] = useState(data.ft_remarks || '');
  const isAssigned = data.tester_id === currentUserId;
  const isSAOverride = currentUserRole === 'super_admin' && !isAssigned;
  const canInteract = isAssigned || isSAOverride;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (result === 'Not Okay' && !remarks.trim()) { toast.error('Remarks are mandatory when result is Not Okay.'); return; }
    const titlePrefix = isSAOverride ? '[SA Override] ' : '';
    updateExperiment(
      { stage: 'Solution Assignment', ft_result: result, ft_remarks: remarks, ft_submitted_at: new Date().toISOString() },
      [{ role_target: 'admin', title: `${titlePrefix}FT Result Submitted`, message: `FT completed for "${data.name}". Result: ${result}. Assign solution now.`, type: 'info' },
       { role_target: 'super_admin', title: `${titlePrefix}FT Result Submitted`, message: `FT completed for "${data.name}". Result: ${result}.`, type: 'info' }]
    );
  };

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Submit Functional Testing Result</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Functional Testing → Solution Assignment</p>
      </div>
      <ExpHeader data={data} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <ReadField label="Priority" value={data.priority} />
        {data.deadline && <ReadField label="Deadline" value={data.deadline} />}
        <ReadField label="Assigned Tester" value={data.tester} />
      </div>
      {isSAOverride && <SAOverrideBanner assignedTo={data.tester} />}
      {!canInteract && <WarnBanner msg="Only the assigned tester can submit results." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={S.label}>Result <span style={{ color: '#ef4444' }}>*</span></label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['Okay', 'Not Okay'].map(r => (
              <button key={r} type="button" onClick={() => canInteract && setResult(r)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${result === r ? (r === 'Okay' ? '#16a34a' : '#dc2626') : '#e5e7eb'}`, background: result === r ? (r === 'Okay' ? '#f0fdf4' : '#fef2f2') : 'white', color: result === r ? (r === 'Okay' ? '#16a34a' : '#dc2626') : '#6b7280', fontSize: '13px', fontWeight: 600, cursor: canInteract ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: "'Inter',sans-serif" }}>
                {r === 'Okay' ? <CheckCircle2 size={15} /> : <XCircle size={15} />} {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={S.label}>Remarks {result === 'Not Okay' ? <span style={{ color: '#ef4444' }}>*</span> : <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span>}</label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} disabled={!canInteract} placeholder="Enter observations…" rows={3} style={{ ...S.input, resize: 'vertical' }} />
        </div>
      </div>
      {canInteract && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
          {(currentUserRole === 'super_admin' || currentUserRole === 'admin') && (
            <button type="button" onClick={onReassign}
              style={{ padding: '10px 14px', border: '1px solid #f59e0b', borderRadius: '7px', background: '#fffbeb', color: '#92400e', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif", display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={13} /> Reassign
            </button>
          )}
          <button type="submit" disabled={isSubmitting || !result || !canInteract} style={primaryBtn(isSubmitting || !result || !canInteract)}>
            {isSubmitting && <Loader2 size={14} className="animate-spin" />} Submit Result
          </button>
        </div>
      )}
      {!canInteract && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
        </div>
      )}
    </form>
  );
};

// ─── Stage 3: Solution Assignment → Solution In Progress ─────────

const AssignSolutionModal = ({ onClose, data, users, updateExperiment, isSubmitting, currentUserRole, onReassign }: any) => {
  const [assignee, setAssignee] = useState('');
  const solutionUsers = users.filter((u: any) => u.role === 'solution' && u.status === 'active');
  // Only Super Admin, Admin (Head of Operations) can assign solution
  const canAct = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAct) { toast.error('Only Super Admin or Admin can assign solution.'); return; }
    const sel = users.find((u: any) => u.id === assignee);
    updateExperiment(
      { stage: 'Solution In Progress', solution_assignee: sel?.name, solution_assignee_id: assignee, solution_assigned_at: new Date().toISOString() },
      [{ user_id: assignee, title: 'Solution Assignment', message: `You have been assigned Solution for: "${data.name}" (Grade ${data.grade}). FT Result: ${data.ft_result}`, type: 'info' }]
    );
  };

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Assign for Solution</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Solution Assignment → Solution In Progress</p>
      </div>
      <ExpHeader data={data} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <ReadField label="Functional Tester" value={data.tester} />
        <ReadField label="FT Result" value={data.ft_result} />
        {data.ft_remarks && <div style={{ gridColumn: '1 / -1' }}><ReadField label="FT Remarks" value={data.ft_remarks} /></div>}
      </div>
      {!canAct && <WarnBanner msg="Only Super Admin or Admin (Head of Operations) can assign a solution team member." />}
      <div>
        <label style={S.label}>Solution Assigned To <span style={{ color: '#ef4444' }}>*</span></label>
        <select required disabled={!canAct} value={assignee} onChange={e => setAssignee(e.target.value)} style={{ ...S.input, background: 'white' }}>
          <option value="" disabled>Select active solution user…</option>
          {solutionUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {solutionUsers.length === 0 && canAct && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>No active solution users found.</p>}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
        <button type="submit" disabled={isSubmitting || !assignee || !canAct} style={primaryBtn(isSubmitting || !assignee || !canAct)}>
          {isSubmitting && <Loader2 size={14} className="animate-spin" />} Assign & Notify
        </button>
      </div>
    </form>
  );
};

// ─── Stage 4: Solution In Progress → Design Team Acceptance ──────

const SolutionHandoverModal = ({ onClose, data, currentUserId, currentUserRole, users, updateExperiment, isSubmitting, onReassign }: any) => {
  const [physical, setPhysical] = useState(!!data.handover_physical_model);
  const [engData, setEngData] = useState(!!data.handover_engineering_data);
  const [kt, setKt] = useState(!!data.handover_kt);
  const [remarks, setRemarks] = useState('');
  const [showHold, setShowHold] = useState(false);
  const [holdRemarks, setHoldRemarks] = useState('');
  const isAssigned = data.solution_assignee_id === currentUserId;
  const isSAOverride = currentUserRole === 'super_admin' && !isAssigned;
  const canInteract = isAssigned || isSAOverride;
  const canSubmit = physical && engData && kt && canInteract && !isSubmitting;

  const onHandover = () => {
    const designUsers = users.filter((u: any) => u.role === 'design' && u.status === 'active');
    updateExperiment(
      { stage: 'Design Team Acceptance', handover_physical_model: physical, handover_engineering_data: engData, handover_kt: kt, handover_given_at: new Date().toISOString(), solution_remarks: remarks },
      designUsers.map((u: any) => ({ user_id: u.id, title: 'Handover Ready', message: `Solution handover for "${data.name}" is ready for design acceptance.`, type: 'info' }))
    );
  };

  const onHold = () => {
    if (!holdRemarks.trim()) { toast.error('On Hold remarks are mandatory.'); return; }
    const adminUsers = users.filter((u: any) => u.role === 'admin' || u.role === 'super_admin');
    updateExperiment(
      { on_hold: true, on_hold_remarks: holdRemarks },
      adminUsers.map((u: any) => ({ user_id: u.id, title: 'Experiment On Hold', message: `"${data.name}" has been placed on hold. Reason: ${holdRemarks}`, type: 'warning' }))
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Solution Handover Checklist</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Solution In Progress → Design Team Acceptance</p>
      </div>
      <ExpHeader data={data} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <ReadField label="FT Result" value={data.ft_result} />
        <ReadField label="Solution Assigned To" value={data.solution_assignee} />
        {data.ft_remarks && <div style={{ gridColumn: '1 / -1' }}><ReadField label="FT Remarks" value={data.ft_remarks} /></div>}
      </div>
      {isSAOverride && <SAOverrideBanner assignedTo={data.solution_assignee} />}
      {!canInteract && <WarnBanner msg="Only the assigned solution user can submit handover." />}
      {canInteract && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Handover Checklist</p>
          {[
            { label: 'Physical Model Handover', val: physical, set: setPhysical, req: true },
            { label: 'Engineering Data', val: engData, set: setEngData, req: true },
            { label: 'KT – Knowledge Transfer', val: kt, set: setKt, req: true },
          ].map((item, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: item.val ? '#f0fdf4' : '#f9fafb', borderRadius: '8px', border: `1px solid ${item.val ? '#86efac' : '#e5e7eb'}` }}>
              <input type="checkbox" checked={item.val} onChange={e => item.set(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#c45c5c' }} />
              <span style={{ fontSize: '13px', color: '#374151' }}>{item.label} {item.req && <span style={{ color: '#ef4444' }}>*</span>}</span>
            </label>
          ))}
          <div>
            <label style={S.label}>Remarks <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add handover notes…" rows={2} style={{ ...S.input, resize: 'vertical' }} />
          </div>
        </div>
      )}
      {showHold && (
        <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>Mark as On Hold — Reason <span style={{ color: '#ef4444' }}>*</span></p>
          <textarea value={holdRemarks} onChange={e => setHoldRemarks(e.target.value)} placeholder="Reason for hold…" rows={2} style={{ ...S.input, border: '1px solid #fbbf24', resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button type="button" onClick={() => setShowHold(false)} style={{ ...S.secBtn, flex: 1 }}>Cancel</button>
            <button type="button" onClick={onHold} style={{ flex: 2, padding: '8px', border: 'none', borderRadius: '6px', background: '#f59e0b', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Confirm On Hold</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
        <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
        {(currentUserRole === 'super_admin' || currentUserRole === 'admin') && !showHold && (
          <button type="button" onClick={onReassign}
            style={{ padding: '10px 14px', border: '1px solid #f59e0b', borderRadius: '7px', background: '#fffbeb', color: '#92400e', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif", display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={13} /> Reassign to FT
          </button>
        )}
        {canInteract && !showHold && (
          <button type="button" onClick={() => setShowHold(true)} style={{ padding: '10px 16px', border: '1px solid #fbbf24', borderRadius: '7px', background: '#fffbeb', color: '#92400e', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>On Hold</button>
        )}
        <button type="button" onClick={onHandover} disabled={!canSubmit} style={primaryBtn(!canSubmit)}>
          {isSubmitting && <Loader2 size={14} className="animate-spin" />} Submit Handover
        </button>
      </div>
    </div>
  );
};

// ─── Stage 5: Design Team Acceptance ─────────────────────────────

const DesignAcceptanceModal = ({ onClose, data, currentUserId, currentUserRole, currentUserName, users, updateExperiment, isSubmitting, onReassign }: any) => {
  const [acceptRemarks, setAcceptRemarks] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [view, setView] = useState<'main' | 'reject'>('main');
  const isDesign = currentUserRole === 'design';
  const alreadyActioned = !!data.design_assignee_id;

  const onAccept = () => {
    updateExperiment(
      { stage: 'Design In Progress', design_assignee_id: currentUserId, design_assignee: currentUserName, design_accepted_at: new Date().toISOString(), acceptance_remarks: acceptRemarks },
      [{ user_id: currentUserId, title: 'Handover Accepted', message: `You accepted the handover for "${data.name}". Please proceed with design.`, type: 'success' }]
    );
  };

  const onReject = () => {
    if (!rejectRemarks.trim()) { toast.error('Rejection remarks are mandatory.'); return; }
    updateExperiment(
      { stage: 'Solution In Progress', design_assignee_id: null, design_assignee: null, rejection_remarks: rejectRemarks },
      [{ user_id: data.solution_assignee_id, title: 'Handover Rejected', message: `Handover for "${data.name}" was rejected by design team. Reason: ${rejectRemarks}`, type: 'warning' }]
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Design Team Acceptance</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Design Team Acceptance → Design In Progress</p>
      </div>
      <ExpHeader data={data} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <ReadField label="FT Result" value={data.ft_result} />
        <ReadField label="Functional Tester" value={data.tester} />
        <ReadField label="Solution Assigned To" value={data.solution_assignee} />
        {data.ft_remarks && <div style={{ gridColumn: '1 / -1' }}><ReadField label="FT Remarks" value={data.ft_remarks} /></div>}
        <ReadField label="Physical Model" value={data.handover_physical_model ? '✓ Handed Over' : '✗ Not Handed Over'} />
        <ReadField label="Engineering Data" value={data.handover_engineering_data ? '✓ Handed Over' : '✗ Not Handed Over'} />
        <ReadField label="KT" value={data.handover_kt ? '✓ Completed' : '✗ Not Completed'} />
        {data.solution_remarks && <div style={{ gridColumn: '1 / -1' }}><ReadField label="Solution Remarks" value={data.solution_remarks} /></div>}
      </div>
      {(currentUserRole === 'super_admin' || currentUserRole === 'admin') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button type="button" onClick={onReassign}
            style={{ padding: '8px 14px', border: '1px solid #f59e0b', borderRadius: '7px', background: '#fffbeb', color: '#92400e', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif", display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={12} /> Reassign to FT
          </button>
        </div>
      )}
      {!isDesign && !(currentUserRole === 'super_admin' || currentUserRole === 'admin') && <WarnBanner msg="Only Design role users can accept or reject handover." />}
      {!isDesign && (currentUserRole === 'super_admin' || currentUserRole === 'admin') && <WarnBanner msg="As Super Admin / Admin you can reassign this experiment back to Functional Testing using the button above." />}
      {alreadyActioned && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}><p style={{ fontSize: '13px', color: '#16a34a' }}>✓ Already actioned by {data.design_assignee}</p></div>}
      {isDesign && !alreadyActioned && (
        view === 'main' ? (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={S.label}>Acceptance Remarks <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
              <textarea value={acceptRemarks} onChange={e => setAcceptRemarks(e.target.value)} placeholder="Add notes…" rows={2} style={{ ...S.input, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
              <button type="button" onClick={() => setView('reject')} style={{ flex: 1, padding: '10px', border: '1px solid #fca5a5', borderRadius: '7px', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Reject</button>
              <button type="button" onClick={onAccept} disabled={isSubmitting} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '7px', background: '#16a34a', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isSubmitting && <Loader2 size={14} className="animate-spin" />} Accept
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={S.label}>Rejection Remarks <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea value={rejectRemarks} onChange={e => setRejectRemarks(e.target.value)} placeholder="Reason for rejection…" rows={3} style={{ ...S.input, border: '1px solid #fca5a5', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setView('main')} style={S.secBtn}>Back</button>
              <button type="button" onClick={onReject} disabled={isSubmitting || !rejectRemarks.trim()} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '7px', background: !rejectRemarks.trim() || isSubmitting ? '#e5e7eb' : '#dc2626', color: 'white', fontSize: '13px', fontWeight: 600, cursor: !rejectRemarks.trim() ? 'not-allowed' : 'pointer', fontFamily: "'Inter',sans-serif" }}>
                Confirm Rejection
              </button>
            </div>
          </>
        )
      )}
      {(!isDesign || alreadyActioned) && <button type="button" onClick={onClose} style={{ ...S.secBtn, width: '100%', marginTop: '8px' }}>Close</button>}
    </div>
  );
};

// ─── Stage 6: Design In Progress → Design Approval ───────────────

const DesignProgressModal = ({ onClose, data, currentUserId, currentUserRole, users, updateExperiment, isSubmitting, onReassign }: any) => {
  const [deadline, setDeadline] = useState(data.design_deadline || '');
  const [filesLink, setFilesLink] = useState(data.design_files_link || '');
  const [remarks, setRemarks] = useState(data.design_remarks || '');
  const today = new Date().toISOString().split('T')[0];
  const isAssigned = data.design_assignee_id === currentUserId;
  const isSAOverride = currentUserRole === 'super_admin' && !isAssigned;
  const canInteract = isAssigned || isSAOverride;
  const isValidUrl = (u: string) => { try { new URL(u); return true; } catch { return false; } };

  const onSave = () => {
    if (!deadline) { toast.error('Design Deadline is mandatory.'); return; }
    if (filesLink && !isValidUrl(filesLink)) { toast.error('Design Files Link must be a valid URL.'); return; }
    updateExperiment({ design_deadline: deadline, design_files_link: filesLink, design_remarks: remarks }, []);
    toast.success('Progress saved.'); onClose();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadline) { toast.error('Design Deadline is mandatory.'); return; }
    if (!filesLink) { toast.error('Link to Design Files is mandatory to submit.'); return; }
    if (!isValidUrl(filesLink)) { toast.error('Design Files Link must be a valid URL.'); return; }
    const titlePrefix = isSAOverride ? '[SA Override] ' : '';
    const adminUsers = users.filter((u: any) => u.role === 'admin' || u.role === 'super_admin');
    updateExperiment(
      { stage: 'Design Approval', design_deadline: deadline, design_files_link: filesLink, design_remarks: remarks, design_submitted_at: new Date().toISOString() },
      adminUsers.map((u: any) => ({ user_id: u.id, title: `${titlePrefix}Design Ready for Approval`, message: `"${data.name}" design has been submitted for approval.`, type: 'info' }))
    );
  };

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Design In Progress</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Design In Progress → Design Approval</p>
      </div>
      <ExpHeader data={data} />
      {isSAOverride && <SAOverrideBanner assignedTo={data.design_assignee} />}
      {!canInteract && <WarnBanner msg={`Only ${data.design_assignee || 'the assigned designer'} can update this stage.`} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={S.label}>Design Deadline <span style={{ color: '#ef4444' }}>*</span></label>
          <input type="date" min={today} value={deadline} onChange={e => setDeadline(e.target.value)} disabled={!canInteract} style={S.input} />
        </div>
        <div>
          <label style={S.label}>Link to Design Files <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Required to submit)</span></label>
          <input type="url" value={filesLink} onChange={e => setFilesLink(e.target.value)} disabled={!canInteract} placeholder="https://drive.google.com/…" style={S.input} />
        </div>
        <div>
          <label style={S.label}>Remarks <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} disabled={!canInteract} placeholder="Design notes…" rows={2} style={{ ...S.input, resize: 'vertical' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
        <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
        {(currentUserRole === 'super_admin' || currentUserRole === 'admin') && (
          <button type="button" onClick={onReassign}
            style={{ padding: '10px 14px', border: '1px solid #f59e0b', borderRadius: '7px', background: '#fffbeb', color: '#92400e', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif", display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={13} /> Reassign to FT
          </button>
        )}
        {canInteract && <button type="button" onClick={onSave} style={{ padding: '10px 20px', border: '1px solid #c45c5c', borderRadius: '7px', background: 'white', color: '#c45c5c', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Save</button>}
        <button type="submit" disabled={isSubmitting || !canInteract} style={primaryBtn(isSubmitting || !canInteract)}>
          {isSubmitting && <Loader2 size={14} className="animate-spin" />} Submit for Approval
        </button>
      </div>
    </form>
  );
};

// ─── Stage 7: Design Approval → File Upload ──────────────────────

const DesignApprovalModal = ({ onClose, data, currentUserId, currentUserRole, currentUserName, users, updateExperiment, isSubmitting }: any) => {
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [view, setView] = useState<'main' | 'reject'>('main');
  const canAct = currentUserRole === 'admin' || currentUserRole === 'super_admin';

  const onApprove = () => {
    updateExperiment(
      { stage: 'File Upload', approval_by_id: currentUserId, approval_by: currentUserName, approval_remarks: approvalRemarks, biswa_approval: 'Approved', biswa_reviewed_at: new Date().toISOString() },
      [{ user_id: data.design_assignee_id, title: '✓ Design Approved', message: `Your design for "${data.name}" has been approved! Please proceed to File Upload.`, type: 'success' }]
    );
  };

  const onReject = () => {
    if (!rejectRemarks.trim()) { toast.error('Rejection remarks are mandatory.'); return; }
    updateExperiment(
      { stage: 'Design In Progress', biswa_approval: 'Rejected', biswa_comments: rejectRemarks, biswa_reviewed_at: new Date().toISOString(), design_submitted_at: null },
      [{ user_id: data.design_assignee_id, title: 'Design Rejected', message: `Your design for "${data.name}" was rejected. Remarks: ${rejectRemarks}`, type: 'warning' }]
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Design Approval</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Design Approval → File Upload</p>
      </div>
      <ExpHeader data={data} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <ReadField label="Designer" value={data.design_assignee} />
        <ReadField label="Design Deadline" value={data.design_deadline} />
        {data.design_files_link && <div style={{ gridColumn: '1 / -1' }}><ReadField label="Design Files" value={data.design_files_link} isLink /></div>}
        {data.design_remarks && <div style={{ gridColumn: '1 / -1' }}><ReadField label="Designer Remarks" value={data.design_remarks} /></div>}
      </div>
      {!canAct && <WarnBanner msg="Only Admin or Super Admin can approve/reject designs." />}
      {canAct && (
        view === 'main' ? (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={S.label}>Approval Remarks <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
              <textarea value={approvalRemarks} onChange={e => setApprovalRemarks(e.target.value)} placeholder="Add notes…" rows={2} style={{ ...S.input, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
              <button type="button" onClick={() => setView('reject')} style={{ flex: 1, padding: '10px', border: '1px solid #fca5a5', borderRadius: '7px', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Reject</button>
              <button type="button" onClick={onApprove} disabled={isSubmitting} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '7px', background: '#16a34a', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isSubmitting && <Loader2 size={14} className="animate-spin" />} Approve
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={S.label}>Rejection Remarks <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea value={rejectRemarks} onChange={e => setRejectRemarks(e.target.value)} placeholder="Reason for rejection…" rows={3} style={{ ...S.input, border: '1px solid #fca5a5', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setView('main')} style={S.secBtn}>Back</button>
              <button type="button" onClick={onReject} disabled={isSubmitting || !rejectRemarks.trim()} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '7px', background: !rejectRemarks.trim() ? '#e5e7eb' : '#dc2626', color: 'white', fontSize: '13px', fontWeight: 600, cursor: !rejectRemarks.trim() ? 'not-allowed' : 'pointer', fontFamily: "'Inter',sans-serif" }}>
                Confirm Rejection
              </button>
            </div>
          </>
        )
      )}
      {!canAct && <button type="button" onClick={onClose} style={{ ...S.secBtn, width: '100%', marginTop: '8px' }}>Close</button>}
    </div>
  );
};

// ─── Stage 8: File Upload → Procurement ──────────────────────────

const FileUploadModal = ({ onClose, data, currentUserId, currentUserRole, users, updateExperiment, isSubmitting }: any) => {
  const [folderLink, setFolderLink] = useState(data.folder_link || '');
  const [additionalLink, setAdditionalLink] = useState(data.additional_link || '');
  const [remarks, setRemarks] = useState(data.upload_remarks || '');
  const isAssigned = data.design_assignee_id === currentUserId;
  const isSAOverride = currentUserRole === 'super_admin' && !isAssigned;
  const canInteract = isAssigned || isSAOverride;
  const isValidUrl = (u: string) => { try { new URL(u); return true; } catch { return false; } };

  const validate = (requireFolder: boolean) => {
    if (requireFolder && !folderLink) { toast.error('Upload Folder Link is mandatory to submit.'); return false; }
    if (folderLink && !isValidUrl(folderLink)) { toast.error('Upload Folder Link must be a valid URL.'); return false; }
    if (additionalLink && !isValidUrl(additionalLink)) { toast.error('Additional Link must be a valid URL.'); return false; }
    return true;
  };

  const onSave = () => {
    if (!validate(false)) return;
    updateExperiment({ folder_link: folderLink, additional_link: additionalLink, upload_remarks: remarks }, []);
    toast.success('Progress saved.'); onClose();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(true)) return;
    const titlePrefix = isSAOverride ? '[SA Override] ' : '';
    const procUsers = users.filter((u: any) => u.role === 'procurement' && u.status === 'active');
    updateExperiment(
      { stage: 'Procurement', folder_link: folderLink, additional_link: additionalLink, upload_remarks: remarks, file_uploaded_at: new Date().toISOString() },
      procUsers.map((u: any) => ({ user_id: u.id, title: `${titlePrefix}Files Ready for Procurement`, message: `"${data.name}" files have been uploaded. Please verify procurement.`, type: 'info' }))
    );
  };

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>File Upload</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>File Upload → Procurement</p>
      </div>
      <ExpHeader data={data} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <ReadField label="FT Result" value={data.ft_result} />
        {data.ft_remarks && <ReadField label="FT Remarks" value={data.ft_remarks} />}
        {data.design_files_link && <div style={{ gridColumn: '1 / -1' }}><ReadField label="Design Files (Stage 6)" value={data.design_files_link} isLink /></div>}
        {data.design_remarks && <div style={{ gridColumn: '1 / -1' }}><ReadField label="Designer Remarks" value={data.design_remarks} /></div>}
        {data.approval_remarks && <div style={{ gridColumn: '1 / -1' }}><ReadField label="Approval Comments" value={data.approval_remarks} /></div>}
      </div>
      {isSAOverride && <SAOverrideBanner assignedTo={data.design_assignee} />}
      {!canInteract && <WarnBanner msg={`Only ${data.design_assignee || 'the assigned designer'} can upload files.`} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={S.label}>Upload Folder Link <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Required to submit)</span></label>
          <input type="url" value={folderLink} onChange={e => setFolderLink(e.target.value)} disabled={!canInteract} placeholder="https://drive.google.com/…" style={S.input} />
        </div>
        <div>
          <label style={S.label}>Additional Link <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
          <input type="url" value={additionalLink} onChange={e => setAdditionalLink(e.target.value)} disabled={!canInteract} placeholder="https://…" style={S.input} />
        </div>
        <div>
          <label style={S.label}>Remarks <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} disabled={!canInteract} placeholder="Upload notes…" rows={2} style={{ ...S.input, resize: 'vertical' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
        {canInteract && <button type="button" onClick={onSave} style={{ padding: '10px 20px', border: '1px solid #c45c5c', borderRadius: '7px', background: 'white', color: '#c45c5c', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Save</button>}
        <button type="submit" disabled={isSubmitting || !canInteract} style={primaryBtn(isSubmitting || !canInteract)}>
          {isSubmitting && <Loader2 size={14} className="animate-spin" />} Submit to Procurement
        </button>
      </div>
    </form>
  );
};

// ─── Stage 9: Procurement → Completed ────────────────────────────

const ProcurementModal = ({ onClose, data, currentUserId, currentUserRole, currentUserName, users, updateExperiment, isSubmitting }: any) => {
  const [verified, setVerified] = useState(false);
  const [notes, setNotes] = useState('');
  const isProcurement = currentUserRole === 'procurement';
  const isSAOverride = currentUserRole === 'super_admin' && !isProcurement;
  const canAct = isProcurement || isSAOverride;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verified) { toast.error('Please verify procurement data first.'); return; }
    const titlePrefix = isSAOverride ? '[SA Override] ' : '';
    const adminUsers = users.filter((u: any) => u.role === 'admin' || u.role === 'super_admin');
    updateExperiment(
      { stage: 'Completed', procurement_status: 'Checked', procurement_notes: notes, procurement_verified_by: currentUserId, procurement_verified_by_name: currentUserName, procurement_checked_at: new Date().toISOString(), completed_at: new Date().toISOString() },
      adminUsers.map((u: any) => ({ user_id: u.id, title: `${titlePrefix}🎉 Experiment Completed`, message: `"${data.name}" has completed the full workflow!`, type: 'success' }))
    );
  };

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Procurement</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Procurement → Completed</p>
      </div>
      <ExpHeader data={data} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {data.folder_link && <ReadField label="Folder Link" value={data.folder_link} isLink />}
        {data.additional_link && <ReadField label="Additional Link" value={data.additional_link} isLink />}
      </div>
      {isSAOverride && <SAOverrideBanner />}
      {!canAct && <WarnBanner msg="Only Procurement users can mark as checked." />}
      {canAct && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: verified ? '#f0fdf4' : '#f9fafb', borderRadius: '8px', border: `1px solid ${verified ? '#86efac' : '#e5e7eb'}` }}>
            <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#16a34a' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Procurement Data Verified <span style={{ color: '#ef4444' }}>*</span></span>
          </label>
          <div>
            <label style={S.label}>Notes <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Procurement notes…" rows={2} style={{ ...S.input, resize: 'vertical' }} />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
        {canAct && (
          <button type="submit" disabled={isSubmitting || !verified} style={primaryBtn(isSubmitting || !verified)}>
            {isSubmitting && <Loader2 size={14} className="animate-spin" />} Mark as Checked
          </button>
        )}
      </div>
    </form>
  );
};

// ─── Stage 10: Completed (read-only) ─────────────────────────────

const CompletedViewModal = ({ onClose, data }: any) => (
  <div>
    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Experiment Completed</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Full read-only history</p>
      </div>
      <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>✓ COMPLETED</span>
    </div>
    <ExpHeader data={data} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ReadField label="Functional Tester" value={data.tester} />
      <ReadField label="FT Result" value={data.ft_result} />
      <ReadField label="FT Remarks" value={data.ft_remarks} />
      <ReadField label="Solution Assigned To" value={data.solution_assignee} />
      <ReadField label="Designer" value={data.design_assignee} />
      <ReadField label="Design Files" value={data.design_files_link} isLink />
      <ReadField label="Designer Remarks" value={data.design_remarks} />
      <ReadField label="Approved By" value={data.approval_by} />
      <ReadField label="Approval Remarks" value={data.approval_remarks} />
      <ReadField label="Upload Folder" value={data.folder_link} isLink />
      <ReadField label="Additional Link" value={data.additional_link} isLink />
      <ReadField label="Procurement Verified By" value={data.procurement_verified_by_name} />
      <ReadField label="Procurement Notes" value={data.procurement_notes} />
      <ReadField label="Completed At" value={data.completed_at ? new Date(data.completed_at).toLocaleString() : null} />
    </div>
    <button type="button" onClick={onClose} style={{ ...S.secBtn, width: '100%', marginTop: '24px' }}>Close</button>
  </div>
);

// ─── Reassign to FT Modal ────────────────────────────────────────
// Accessible to super_admin / admin from any stage before Design Approval.
// Wipes all prior work data, resets to Functional Testing, preserves audit trail.

const REASSIGN_WIPEABLE_FIELDS = {
  // Stage 1 FT
  stage: 'Functional Testing',
  tester: null, tester_id: null, ft_result: null, ft_remarks: null, ft_submitted_at: null,
  // Stage 2 Solution Assignment
  solution_assignee: null, solution_assignee_id: null, solution_assigned_at: null, solution_remarks: null,
  // Stage 3 Handover
  handover_physical_model: false, handover_engineering_data: false, handover_kt: false, handover_given_at: null,
  // Stage 4 Design Acceptance
  design_assignee_id: null, design_assignee: null, design_accepted_at: null,
  acceptance_remarks: null, rejection_remarks: null,
  // Stage 5 Design In Progress
  design_deadline: null, design_files_link: null, design_remarks: null, design_submitted_at: null,
  // Hold flags
  on_hold: false, on_hold_remarks: null,
};

const ReassignToFTModal = ({ onClose, data, users, currentUserId, currentUserRole, currentUserName, supabase, isSubmitting, setIsSubmitting }: any) => {
  const [newTester, setNewTester] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const canAct = currentUserRole === 'super_admin' || currentUserRole === 'admin';
  const testers = users.filter((u: any) => u.role === 'tester' && u.status === 'active');

  const handleExport = () => {
    try {
      const snapshot: Record<string, any> = {
        'Experiment Name': data.name ?? '',
        'Grade': data.grade ?? '',
        'Priority': data.priority ?? '',
        'Stage at Reassignment': data.stage ?? '',
        'Deadline': data.deadline ?? '',
        // FT
        'FT Tester': data.tester ?? '',
        'FT Result': data.ft_result ?? '',
        'FT Remarks': data.ft_remarks ?? '',
        'FT Submitted At': data.ft_submitted_at ? new Date(data.ft_submitted_at).toLocaleString() : '',
        // Solution
        'Solution Assignee': data.solution_assignee ?? '',
        'Solution Assigned At': data.solution_assigned_at ? new Date(data.solution_assigned_at).toLocaleString() : '',
        'Solution Remarks': data.solution_remarks ?? '',
        // Handover
        'Handover Physical Model': data.handover_physical_model ? 'Yes' : 'No',
        'Handover Engineering Data': data.handover_engineering_data ? 'Yes' : 'No',
        'Handover KT': data.handover_kt ? 'Yes' : 'No',
        'Handover Given At': data.handover_given_at ? new Date(data.handover_given_at).toLocaleString() : '',
        // Design
        'Designer': data.design_assignee ?? '',
        'Design Accepted At': data.design_accepted_at ? new Date(data.design_accepted_at).toLocaleString() : '',
        'Design Deadline': data.design_deadline ?? '',
        'Design Files Link': data.design_files_link ?? '',
        'Designer Remarks': data.design_remarks ?? '',
        'Design Submitted At': data.design_submitted_at ? new Date(data.design_submitted_at).toLocaleString() : '',
        // Misc
        'On Hold': data.on_hold ? 'Yes' : 'No',
        'On Hold Remarks': data.on_hold_remarks ?? '',
      };
      const ws = XLSX.utils.json_to_sheet([snapshot]);
      ws['!cols'] = Object.keys(snapshot).map(k => ({ wch: Math.max(k.length + 4, 24) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Snapshot Before Reassign');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      XLSX.writeFile(wb, `Reassign_Snapshot_${data.sl_no}_${timestamp}.xlsx`);
      toast.success('Snapshot downloaded!');
    } catch (err) {
      toast.error('Export failed.');
    }
  };

  const handleReassign = async () => {
    if (!confirmed) { toast.error('Please confirm the data wipe by checking the box.'); return; }
    if (!newTester) { toast.error('Please select a new tester.'); return; }
    if (!reason.trim()) { toast.error('Reassignment reason is mandatory.'); return; }
    const sel = users.find((u: any) => u.id === newTester);
    setIsSubmitting(true);
    try {
      const updates = {
        ...REASSIGN_WIPEABLE_FIELDS,
        tester: sel?.name,
        tester_id: newTester,
      };
      const { error } = await supabase.from('experiments').update(updates).eq('id', data.id);
      if (error) throw error;

      // Notify new tester
      await supabase.from('notifications').insert({
        user_id: newTester,
        title: '🔄 Reassigned — Functional Testing',
        message: `You have been reassigned for Functional Testing of "${data.name}" (Grade ${data.grade}). Reason: ${reason}`,
        type: 'warning',
      });

      // Audit log — rich entry preserving context
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_log').insert({
        experiment_id: data.id,
        user_id: user?.id,
        action: `Reassigned to Functional Testing (from ${data.stage})`,
        details: JSON.stringify({
          reassigned_by: currentUserName,
          reassigned_by_role: currentUserRole,
          previous_stage: data.stage,
          previous_tester: data.tester,
          previous_solution_assignee: data.solution_assignee,
          previous_designer: data.design_assignee,
          new_tester: sel?.name,
          reason,
          wiped_at: new Date().toISOString(),
        }),
      });

      toast.success(`Reassigned to ${sel?.name} for Functional Testing.`);
      onClose();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Reassignment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ width: '32px', height: '32px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw size={16} style={{ color: '#92400e' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Reassign to Functional Testing</h2>
        </div>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Privileged override — all current work data will be wiped</p>
      </div>

      <ExpHeader data={data} />

      {/* Current state summary */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Current Progress (will be wiped)</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px' }}>
          {data.tester && <div style={{ fontSize: '12px', color: '#374151', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: '#9ca3af' }}>FT Tester:</span> {data.tester}</div>}
          {data.ft_result && <div style={{ fontSize: '12px', color: '#374151', minWidth: 0 }}><span style={{ color: '#9ca3af' }}>FT Result:</span> {data.ft_result}</div>}
          {data.solution_assignee && <div style={{ fontSize: '12px', color: '#374151', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: '#9ca3af' }}>Solution:</span> {data.solution_assignee}</div>}
          {data.design_assignee && <div style={{ fontSize: '12px', color: '#374151', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: '#9ca3af' }}>Designer:</span> {data.design_assignee}</div>}
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', gridColumn: '1/-1', marginTop: '4px' }}>Stage: {data.stage}</div>
        </div>
      </div>

      {/* Download snapshot */}
      <button type="button" onClick={handleExport}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #c45c5c', borderRadius: '8px', background: 'white', color: '#c45c5c', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', lineHeight: 1.4, textAlign: 'center', flexWrap: 'wrap' }}>
        <Download size={14} style={{ flexShrink: 0 }} /> <span>Download Snapshot (XLSX)</span>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* New tester */}
        <div>
          <label style={S.label}>Assign New Tester <span style={{ color: '#ef4444' }}>*</span></label>
          <select value={newTester} onChange={e => setNewTester(e.target.value)} style={{ ...S.input, background: 'white' }}>
            <option value="" disabled>Select active tester…</option>
            {testers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {testers.length === 0 && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>No active tester users found.</p>}
        </div>

        {/* Reason */}
        <div>
          <label style={S.label}>Reason for Reassignment <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Team member left the project / Incorrect data submitted / Workload rebalancing…" rows={3} style={{ ...S.input, resize: 'vertical', border: '1px solid #f59e0b' }} />
        </div>

        {/* Wipe confirmation */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '12px', background: confirmed ? '#fef2f2' : '#f9fafb', borderRadius: '8px', border: `1px solid ${confirmed ? '#fca5a5' : '#e5e7eb'}` }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#dc2626', marginTop: '1px', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
            I understand that <strong>all FT, Solution, and Design data will be permanently wiped</strong> from this record. The audit trail will be preserved.
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
        <button type="button" onClick={onClose} style={{ ...S.secBtn, flexShrink: 0 }}>Cancel</button>
        <button type="button" onClick={handleReassign}
          disabled={isSubmitting || !newTester || !reason.trim() || !confirmed}
          style={{
            flex: 1, minWidth: '160px', padding: '10px', border: 'none', borderRadius: '7px',
            background: (!newTester || !reason.trim() || !confirmed || isSubmitting) ? '#e5e7eb' : '#dc2626',
            color: 'white', fontSize: '13px', fontWeight: 600,
            cursor: (!newTester || !reason.trim() || !confirmed || isSubmitting) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: "'Inter',sans-serif",
          }}>
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          <RotateCcw size={13} /> Confirm Reassignment
        </button>
      </div>
    </div>
  );
};

// ─── Add Experiment Modal (unchanged) ────────────────────────────

const AddExperimentModal = ({ onClose, supabase, isSubmitting, setIsSubmitting }: any) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { count } = await supabase.from('experiments').select('*', { count: 'exact', head: true });
      const nextSl = (count ?? 0) + 1;
      let image_url = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `exp-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('experiment-images').upload(path, imageFile);
        if (!upErr) {
          const { data: pubData } = supabase.storage.from('experiment-images').getPublicUrl(path);
          image_url = pubData?.publicUrl;
        }
      }
      const { data: newExp, error } = await supabase.from('experiments').insert({ sl_no: nextSl, name, grade, priority, image_url, stage: 'Not Assigned' }).select().single();
      if (error) throw error;
      toast.success('Experiment added!');
      onClose();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add experiment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onAdd}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Add New Experiment</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={S.label}>Experiment Name <span style={{ color: '#ef4444' }}>*</span></label>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Enter experiment name…" style={S.input} />
        </div>
        <div>
          <label style={S.label}>Grade <span style={{ color: '#ef4444' }}>*</span></label>
          <select required value={grade} onChange={e => setGrade(e.target.value)} style={{ ...S.input, background: 'white' }}>
            <option value="" disabled>Select grade…</option>
            {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...S.input, background: 'white' }}>
            {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Experiment Image <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
          <div style={{ border: '2px dashed #e5e7eb', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}
            onClick={() => document.getElementById('exp-img-upload')?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }}>
            {imagePreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={imagePreview} alt="Preview" style={{ height: '80px', maxWidth: '200px', objectFit: 'cover', borderRadius: '6px' }} />
                <button type="button" onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ) : (
              <><p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Click or drag image here</p><p style={{ fontSize: '11px', color: '#9ca3af' }}>JPG, PNG up to 5MB</p></>
            )}
          </div>
          <input id="exp-img-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button type="button" onClick={onClose} style={S.secBtn}>Cancel</button>
        <button type="submit" disabled={isSubmitting} style={primaryBtn(isSubmitting)}>
          {isSubmitting && <Loader2 size={14} className="animate-spin" />} Add Experiment
        </button>
      </div>
    </form>
  );
};

// ─── Logout Modal ─────────────────────────────────────────────────

const LogoutModal = ({ onClose, supabase }: any) => (
  <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signOut(); window.location.href = '/login'; }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', background: '#fee2e2', color: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><LogOut size={24} /></div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>Log Out</h2>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>Are you sure you want to log out?</p>
    </div>
    <div style={{ display: 'flex', gap: '10px' }}>
      <button type="button" onClick={onClose} style={{ ...S.secBtn, flex: 1 }}>Cancel</button>
      <button type="submit" style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '7px', background: '#dc2626', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Logout</button>
    </div>
  </form>
);

// ─── Main WorkflowModals Orchestrator ────────────────────────────

export default function WorkflowModals() {
  const { isOpen, type, data, onClose, onOpen } = useModal();
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; name: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    supabase.from('users').select('*').then(({ data: u }) => setUsers(u || []));
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser({ id: user.id, role: user.user_metadata?.role || '', name: user.user_metadata?.name || '' });
    });
  }, [isOpen]);

  // updateExperiment: notify accepts an array of notification objects
  const updateExperiment = async (updates: any, notifications: any[] | null) => {
    if (!data?.id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('experiments').update(updates).eq('id', data.id);
      if (error) throw error;

      // Insert notifications (support role_target for group notify)
      if (notifications && notifications.length > 0) {
        const toInsert: any[] = [];
        for (const n of notifications) {
          if (n.user_id) {
            toInsert.push({ user_id: n.user_id, title: n.title, message: n.message, type: n.type || 'info' });
          } else if (n.role_target) {
            const targets = users.filter((u: any) => u.role === n.role_target);
            targets.forEach((u: any) => toInsert.push({ user_id: u.id, title: n.title, message: n.message, type: n.type || 'info' }));
          }
        }
        if (toInsert.length > 0) {
          await supabase.from('notifications').insert(toInsert).then(({ error: ne }) => {
            if (ne) console.warn('[Notify]', ne.message);
          });
        }
      }

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_log').insert({
        experiment_id: data.id,
        user_id: user?.id,
        action: updates.stage ? `Moved to ${updates.stage}` : 'Updated details',
        details: JSON.stringify(updates),
      }).then(() => {});

      toast.success(updates.stage ? `Moved to: ${updates.stage}` : 'Saved successfully');
      onClose();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalContent = () => {
    const uid = currentUser?.id || '';
    const role = currentUser?.role || '';
    const uname = currentUser?.name || '';
    const stage = data?.stage || 'Not Assigned';

    // Special modals by type
    if (type === 'add_experiment') return <AddExperimentModal onClose={onClose} supabase={supabase} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />;
    if (type === 'logout') return <LogoutModal onClose={onClose} supabase={supabase} />;

    // Reassign modal — triggered from any eligible stage
    if (type === 'reassign_ft') {
      return <ReassignToFTModal
        onClose={onClose}
        data={data}
        users={users}
        currentUserId={uid}
        currentUserRole={role}
        currentUserName={uname}
        supabase={supabase}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
      />;
    }

    // Stages that support reassignment — pass onReassign callback
    const REASSIGNABLE_STAGES = ['Functional Testing', 'Solution Assignment', 'Solution In Progress', 'Design Team Acceptance', 'Design In Progress'];
    const onReassign = REASSIGNABLE_STAGES.includes(stage) && (role === 'super_admin' || role === 'admin')
      ? () => { onOpen('reassign_ft', data); }
      : undefined;

    // Stage-based modal routing
    switch (stage) {
      case 'Not Assigned':
        return <AssignFTModal onClose={onClose} data={data} users={users} updateExperiment={updateExperiment} isSubmitting={isSubmitting} currentUserRole={role} />;
      case 'Functional Testing':
        return <RecordFTModal onClose={onClose} data={data} currentUserId={uid} currentUserRole={role} updateExperiment={updateExperiment} isSubmitting={isSubmitting} onReassign={onReassign} />;
      case 'Solution Assignment':
        return <AssignSolutionModal onClose={onClose} data={data} users={users} updateExperiment={updateExperiment} isSubmitting={isSubmitting} currentUserRole={role} onReassign={onReassign} />;
      case 'Solution In Progress':
        return <SolutionHandoverModal onClose={onClose} data={data} currentUserId={uid} currentUserRole={role} users={users} updateExperiment={updateExperiment} isSubmitting={isSubmitting} onReassign={onReassign} />;
      case 'Design Team Acceptance':
        return <DesignAcceptanceModal onClose={onClose} data={data} currentUserId={uid} currentUserRole={role} currentUserName={uname} users={users} updateExperiment={updateExperiment} isSubmitting={isSubmitting} onReassign={onReassign} />;
      case 'Design In Progress':
        return <DesignProgressModal onClose={onClose} data={data} currentUserId={uid} currentUserRole={role} users={users} updateExperiment={updateExperiment} isSubmitting={isSubmitting} onReassign={onReassign} />;
      case 'Design Approval':
        return <DesignApprovalModal onClose={onClose} data={data} currentUserId={uid} currentUserRole={role} currentUserName={uname} users={users} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'File Upload':
        return <FileUploadModal onClose={onClose} data={data} currentUserId={uid} currentUserRole={role} users={users} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'Procurement':
        return <ProcurementModal onClose={onClose} data={data} currentUserId={uid} currentUserRole={role} currentUserName={uname} users={users} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'Completed':
        return <CompletedViewModal onClose={onClose} data={data} />;
      default:
        return <AssignFTModal onClose={onClose} data={data} users={users} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] shadow-xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto animate-fade-in-up" style={{ padding: 'clamp(16px, 4vw, 24px)' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <X size={20} />
        </button>
        {getModalContent()}
      </div>
    </div>
  );
}
