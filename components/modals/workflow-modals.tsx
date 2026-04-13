'use client';

import { useState, useEffect } from 'react';
import { useModal } from '@/hooks/use-modal';
import { toast } from 'sonner';
import { X, LogOut, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// --- Sub-components to satisfy Rules of Hooks ---

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
      // Use total count to get next unique sl_no (avoids duplicates from max())
      const { count } = await supabase
        .from('experiments')
        .select('*', { count: 'exact', head: true });
      
      const nextSl = (count ?? 0) + 1;

      const { data: newExp, error } = await supabase.from('experiments').insert({
        name,
        grade,
        priority,
        sl_no: nextSl,
        stage: 'Not Assigned'
      }).select().single();

      if (error) throw error;

      // Upload image if provided
      if (imageFile && newExp) {
        const ext = imageFile.name.split('.').pop();
        const path = `${newExp.id}/${Math.random()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('experiment-images').upload(path, imageFile);
        if (!uploadError) {
          await supabase.from('experiments').update({ image_path: path }).eq('id', newExp.id);
        }
      }

      toast.success('Experiment added successfully');
      onClose();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Error adding experiment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onAdd}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Add New Experiment</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
          <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. Simple Electric Circuit" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <select required value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
              <option value="" disabled>Select Grade</option>
              <option value="VI">VI</option>
              <option value="VII">VII</option>
              <option value="VIII">VIII</option>
              <option value="IX">IX</option>
              <option value="X">X</option>
              <option value="XI">XI</option>
              <option value="XII">XII</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select required value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experiment Image <span className="text-gray-400">(Optional)</span></label>
          <div
            style={{ border: '2px dashed #e5e7eb', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}
            onClick={() => document.getElementById('exp-img-upload')?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }}
          >
            {imagePreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={imagePreview} alt="Preview" style={{ height: '80px', maxWidth: '200px', objectFit: 'cover', borderRadius: '6px' }} />
                <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Click or drag image here</p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>JPG, PNG up to 5MB</p>
              </>
            )}
          </div>
          <input id="exp-img-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#c45c5c] text-white rounded-md text-sm font-medium hover:bg-[#a34a4a] transition-colors flex items-center gap-2">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Add Experiment
        </button>
      </div>
    </form>
  );
};

const AssignFTModal = ({ onClose, data, users, updateExperiment, isSubmitting }: any) => {
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState(data.priority || '');
  const [deadline, setDeadline] = useState(data.deadline || '');
  const testers = users.filter((u: any) => u.role === 'tester');
  const today = new Date().toISOString().split('T')[0];

  const onAssign = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUser = users.find((u: any) => u.id === assignee);
    updateExperiment({
      stage: 'Functional Testing',
      tester: selectedUser?.name || 'Unknown',
      tester_id: assignee,
      priority,
    }, {
      user_id: assignee,
      title: 'New Assignment',
      message: `You have been assigned for Functional Testing: ${data.name}`,
      type: 'info'
    });
  };

  return (
    <form onSubmit={onAssign}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Assign for Functional Testing</h2>
      </div>
      <div className="bg-gray-50 p-3 rounded-md mb-4 flex justify-between">
         <div>
            <p className="text-xs text-gray-500 font-semibold mb-0.5">Experiment</p>
            <p className="text-sm font-medium">{data.experimentName || data.name || 'Unknown Experiment'}</p>
         </div>
         <div className="text-right">
            <p className="text-xs text-gray-500 font-semibold mb-0.5">Grade</p>
            <p className="text-sm font-medium">{data.grade || 'N/A'}</p>
         </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tester Assignee<span className="text-red-500 ml-1">*</span></label>
          <select required value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
            <option value="" disabled>Select active tester</option>
            {testers.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
            {testers.length === 0 && <option disabled>No testers found</option>}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority<span className="text-red-500 ml-1">*</span></label>
          <select required value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
            <option value="" disabled>Select Priority</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#c45c5c] text-white rounded-md text-sm font-medium hover:bg-[#a34a4a] transition-colors flex items-center gap-2">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Assign & Notify
        </button>
      </div>
    </form>
  );
};

const RecordFTModal = ({ onClose, data, updateExperiment, isSubmitting }: any) => {
  const [result, setResult] = useState(data.ft_result || '');
  const [remarks, setRemarks] = useState(data.ft_remarks || '');

  const onRecord = (e: React.FormEvent) => {
    e.preventDefault();
    updateExperiment({
      ft_result: result,
      ft_remarks: remarks,
    }, {
      role_target: 'admin',
      title: 'FT Result Submitted',
      message: `${data.name} - Result: ${result}`,
      type: result === 'Okay' ? 'success' : 'warning'
    });
  };

  return (
    <form onSubmit={onRecord}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Record Functional Test Result</h2>
      </div>
      <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm font-medium">
        {data.experimentName || data.name || 'Unknown Experiment'}
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Result<span className="text-red-500 ml-1">*</span></label>
          <select required value={result} onChange={(e) => setResult(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
            <option value="" disabled>Select result</option>
            <option value="Okay">Okay</option>
            <option value="Not Okay">Not Okay</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks {result === 'Not Okay' && <span className="text-red-500 ml-1">*</span>}</label>
          <textarea 
            required={result === 'Not Okay'} 
            maxLength={500}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3} 
            className="w-full p-2 border border-gray-300 rounded-md" 
            placeholder={result === 'Not Okay' ? "Explain issues observed (Required)" : "Any notes (Optional)"}
          ></textarea>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#c45c5c] text-white rounded-md text-sm font-medium hover:bg-[#a34a4a] flex items-center gap-2">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Submit Result
        </button>
      </div>
    </form>
  );
};

const SubmitHandoverModal = ({ onClose, data, updateExperiment, isSubmitting }: any) => {
  const [physical, setPhysical] = useState(false);
  const [engineering, setEngineering] = useState(false);
  const [kt, setKt] = useState(false);
  const [notes, setNotes] = useState('');
  const isValid = physical && engineering;

  const onHandover = (e: React.FormEvent) => {
    e.preventDefault();
    updateExperiment({
      stage: 'Handover',
      ft_remarks: `[Handover Checklist] Physical: ${physical}, Eng: ${engineering}, KT: ${kt}. Notes: ${notes}`
    });
  };

  return (
    <form onSubmit={onHandover}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Submit Handover Checklist</h2>
        <p className="text-sm font-medium text-gray-500 mt-2">{data.experimentName || data.name || 'Unknown Experiment'}</p>
      </div>
      <div className="space-y-3 mb-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={physical} onChange={(e) => setPhysical(e.target.checked)} className="w-5 h-5 text-[#c45c5c] border-gray-300 rounded" />
          <span className="text-sm font-medium text-gray-800">Physical Model Handover <span className="text-red-500 ml-1">*</span></span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={engineering} onChange={(e) => setEngineering(e.target.checked)} className="w-5 h-5 text-[#c45c5c] border-gray-300 rounded" />
          <span className="text-sm font-medium text-gray-800">Engineering Data (Drive) <span className="text-red-500 ml-1">*</span></span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={kt} onChange={(e) => setKt(e.target.checked)} className="w-5 h-5 text-[#c45c5c] border-gray-300 rounded" />
          <span className="text-sm font-medium text-gray-800">KT — Knowledge Transfer (Optional)</span>
        </label>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={!isValid || isSubmitting} className={`px-4 py-2 text-white rounded-md text-sm font-medium flex items-center gap-2 ${isValid ? 'bg-[#c45c5c] hover:bg-[#a34a4a]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Submit Handover
        </button>
      </div>
    </form>
  );
};

const AcceptHandoverModal = ({ onClose, data, updateExperiment, isSubmitting }: any) => {
  const [physical, setPhysical] = useState(false);
  const [engineering, setEngineering] = useState(false);
  const [deadline, setDeadline] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const onAccept = (e: React.FormEvent) => {
    e.preventDefault();
    updateExperiment({
      stage: 'Design In Progress',
      deadline: deadline,
    });
  };

  return (
    <form onSubmit={onAccept}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Accept Handover & Design Setup</h2>
        <p className="text-sm font-medium text-gray-500 mt-2">{data.experimentName || data.name || 'Unknown Experiment'}</p>
      </div>
      <div className="space-y-3 mb-6">
        <label className="flex items-center gap-3">
          <input type="checkbox" required checked={physical} onChange={(e) => setPhysical(e.target.checked)} className="w-5 h-5 text-[#3b82f6] border-gray-300 rounded" />
          <span className="text-sm text-gray-800 font-medium">Physical Model Received <span className="text-red-500 ml-1">*</span></span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" required checked={engineering} onChange={(e) => setEngineering(e.target.checked)} className="w-5 h-5 text-[#3b82f6] border-gray-300 rounded" />
          <span className="text-sm text-gray-800 font-medium">Engineering Data Received <span className="text-red-500 ml-1">*</span></span>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">My Design Deadline <span className="text-red-500">*</span></label>
        <input required min={today} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#3b82f6] text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Accept Handover
        </button>
      </div>
    </form>
  );
};

const SubmitDesignModal = ({ onClose, data, updateExperiment, isSubmitting }: any) => {
  const [confirmed, setConfirmed] = useState(false);
  const onSubmitDesign = (e: React.FormEvent) => {
    e.preventDefault();
    updateExperiment({ stage: 'Design Approval' });
  };
  return (
    <form onSubmit={onSubmitDesign}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Submit Design for Approval</h2>
        <p className="text-sm font-medium text-gray-500 mt-2">{data.experimentName || data.name || 'Unknown Experiment'}</p>
      </div>
      <label className="flex items-center gap-3 mt-4 bg-gray-50 p-3 rounded-md border border-gray-200">
        <input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="w-5 h-5 text-green-600 border-gray-300 rounded" />
        <span className="text-sm font-medium text-gray-800">I confirm the design is complete and ready for review.</span>
      </label>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={!confirmed || isSubmitting} className={`px-4 py-2 text-white rounded-md text-sm font-medium flex items-center gap-2 ${confirmed ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300'}`}>
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Submit Design
        </button>
      </div>
    </form>
  );
};

const ApproveDesignModal = ({ onClose, data, updateExperiment, isSubmitting }: any) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [notes, setNotes] = useState('');
  const onDecision = (e: React.FormEvent) => {
    e.preventDefault();
    updateExperiment({
      stage: isRejecting ? 'Design In Progress' : 'File Upload',
      ft_remarks: `[Design Review] ${isRejecting ? 'Rejected' : 'Approved'}. Notes: ${notes}`
    });
  };
  return (
    <form onSubmit={onDecision}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Design Approval</h2>
      </div>
      <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm font-medium">
        {data.experimentName || data.name || 'Unknown Experiment'}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{isRejecting ? 'Rejection Reason *' : 'Approval Notes'}</label>
        <textarea required={isRejecting} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`w-full p-2 border rounded-md ${isRejecting ? 'border-red-300' : 'border-gray-300'}`} />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={() => isRejecting ? setIsRejecting(false) : onClose()} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        {!isRejecting ? (
          <>
            <button type="button" onClick={() => setIsRejecting(true)} className="px-4 py-2 border border-red-500 text-red-600 rounded-md text-sm font-medium hover:bg-red-50">Reject...</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center gap-2">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Approve
            </button>
          </>
        ) : (
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 flex items-center gap-2">
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Confirm Rejection
          </button>
        )}
      </div>
    </form>
  );
};

const UploadLinkModal = ({ onClose, data, updateExperiment, isSubmitting }: any) => {
  const [url, setUrl] = useState(data.link || '');
  const onUpload = (e: React.FormEvent) => {
    e.preventDefault();
    updateExperiment({ stage: 'Procurement', link: url });
  };
  return (
    <form onSubmit={onUpload}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Upload Design Link</h2>
      </div>
      <input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full p-2 border border-gray-300 rounded-md" />
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSubmitting || !url} className="px-4 py-2 bg-[#c45c5c] text-white rounded-md text-sm font-medium flex items-center gap-2">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Upload & Next
        </button>
      </div>
    </form>
  );
};

const ProcurementModal = ({ onClose, data, updateExperiment, isSubmitting }: any) => {
  const [verified, setVerified] = useState(false);
  const onProcure = (e: React.FormEvent) => {
    e.preventDefault();
    updateExperiment({ stage: 'Completed', procurement: 'Verified' });
  };
  return (
    <form onSubmit={onProcure}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Procurement Check</h2>
      </div>
      <label className="flex items-center gap-3 p-3 border border-green-200 bg-green-50 rounded-md">
        <input type="checkbox" required checked={verified} onChange={(e) => setVerified(e.target.checked)} className="w-5 h-5 text-green-600 border-gray-300 rounded" />
        <span className="text-sm font-semibold text-green-900">Verified</span>
      </label>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={!verified || isSubmitting} className="px-4 py-2 bg-[#c45c5c] text-white rounded-md text-sm font-medium flex items-center gap-2">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Complete
        </button>
      </div>
    </form>
  );
};

const LogoutModal = ({ onClose, supabase }: any) => {
  return (
    <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signOut(); window.location.href = '/login'; }}>
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><LogOut size={24} /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Log Out</h2>
        <p className="text-sm text-gray-500 mb-6">Are you sure?</p>
      </div>
      <div className="flex justify-center gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors">Logout</button>
      </div>
    </form>
  );
};

// --- Main WorkflowModals Component ---

export default function WorkflowModals() {
  const { isOpen, type, data, onClose } = useModal();
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      const { data: usersData, error } = await supabase.from('users').select('*');
      if (error) {
        console.error('Failed to fetch users (RLS may be blocking):', error.message);
      }
      if (usersData) {
        setUsers(usersData.filter((u) => u.status !== 'inactive'));
      }
    }
    if (isOpen) fetchUsers();
  }, [isOpen, supabase]);

  const updateExperiment = async (updates: any, notify?: any) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('experiments').update(updates).eq('id', data.id);
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      // Read role from JWT metadata (no DB call needed)
      const role = user?.user_metadata?.role;
      
      let actionText = updates.stage ? `Moved to ${updates.stage}` : 'Updated details';
      if ((role === 'admin' || role === 'super_admin') && data.stage !== updates.stage && data.stage !== 'Not Assigned') {
        actionText = `${actionText} (Admin action on behalf of assigned role)`;
      }

      await supabase.from('audit_log').insert({
        experiment_id: data.id,
        user_id: user?.id,
        action: actionText,
        details: JSON.stringify(updates)
      });

      if (notify) {
        if (notify.user_id) {
          await supabase.from('notifications').insert(notify);
        } else if (notify.role_target) {
          // Notify all users of a certain role (simple version)
          const { data: targetUsers } = await supabase.from('users').select('id').eq('role', notify.role_target);
          if (targetUsers) {
            const batch = targetUsers.map(u => ({
              user_id: u.id,
              title: notify.title,
              message: notify.message,
              type: notify.type || 'info'
            }));
            await supabase.from('notifications').insert(batch);
          }
        }
      }

      toast.success('Updated successfully!');
      onClose();
      window.location.reload(); 
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalContent = () => {
    switch (type) {
      case 'add_experiment': return <AddExperimentModal onClose={onClose} supabase={supabase} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />;
      case 'assign_ft': return <AssignFTModal onClose={onClose} data={data} users={users} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'record_ft': return <RecordFTModal onClose={onClose} data={data} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'submit_handover': return <SubmitHandoverModal onClose={onClose} data={data} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'accept_handover': return <AcceptHandoverModal onClose={onClose} data={data} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'submit_design': return <SubmitDesignModal onClose={onClose} data={data} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'approve_design': return <ApproveDesignModal onClose={onClose} data={data} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'upload_link': return <UploadLinkModal onClose={onClose} data={data} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'procurement_check': return <ProcurementModal onClose={onClose} data={data} updateExperiment={updateExperiment} isSubmitting={isSubmitting} />;
      case 'logout': return <LogoutModal onClose={onClose} supabase={supabase} />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] p-6 shadow-xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <X size={20} />
        </button>
        {getModalContent()}
      </div>
    </div>
  );
}
