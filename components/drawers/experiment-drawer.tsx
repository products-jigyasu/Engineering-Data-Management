'use client';

import { useEffect, useState, useRef } from 'react';
import { useDrawer } from '@/hooks/use-drawer';
import { useModal } from '@/hooks/use-modal';
import { X, Image as ImageIcon, ExternalLink, Activity, CheckCircle2, Upload, Save, UserPlus, Loader2 } from 'lucide-react';
import { STAGE_COLORS, PRIORITY_COLORS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

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

export default function ExperimentDrawer() {
  const { isOpen, data, onClose } = useDrawer();
  const { onOpen: openModal } = useModal();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for editable fields
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (data) setEditData({ ...data });
  }, [data, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${data.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('experiments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update experiment record
      const { error: updateError } = await supabase
        .from('experiments')
        .update({ image_path: filePath })
        .eq('id', data.id);

      if (updateError) throw updateError;

      setEditData({ ...editData, image_path: filePath });
      toast.success('Image uploaded successfully');
      // window.location.reload(); // Optional
    } catch (err: any) {
      toast.error(err.message || 'Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const { id, ...updates } = editData;
      // Filter out internal properties or fields we don't want to save directly
      const { error } = await supabase
        .from('experiments')
        .update({
          tester: updates.tester,
          sa: updates.sa,
          ft_result: updates.ft_result,
          ft_remarks: updates.ft_remarks,
          deadline: updates.deadline,
          link: updates.link,
          priority: updates.priority
        })
        .eq('id', data.id);

      if (error) throw error;
      toast.success('Experiment saved');
    } catch (err: any) {
      toast.error(err.message || 'Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const getActionForStage = (stage: string) => {
    switch (stage) {
      case 'Not Assigned': return { label: 'Assign FT', modal: 'assign_ft', color: '#c45c5c' };
      case 'Functional Testing': return { label: 'Go to Solution', modal: 'assign_sa', color: '#c45c5c' };
      case 'Solution Assignment': return { label: 'Move to Handover', modal: 'submit_handover', color: '#c45c5c' };
      case 'Handover': return { label: 'Accept & Design', modal: 'accept_handover', color: '#3b82f6' };
      case 'Design In Progress': return { label: 'Submit Design', modal: 'submit_design', color: '#10b981' };
      case 'Design Approval': return { label: 'Final Approval', modal: 'approve_design', color: '#10b981' };
      case 'File Upload': return { label: 'Complete Upload', modal: 'upload_link', color: '#6366f1' };
      case 'Procurement': return { label: 'Finish Procurement', modal: 'procurement_check', color: '#1a1a2e' };
      default: return null;
    }
  };

  const actionObj = getActionForStage(editData.stage);
  const currentStageIdx = STAGES_ORDER.indexOf(editData.stage);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-[540px] max-w-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight line-clamp-2 pr-4">{editData.name || 'Experiment Details'}</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">Grade {editData.grade || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Image & Upload Area */}
          <div className="mb-6 relative group">
            {editData.image_path ? (
              <div className="relative">
                <img 
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/experiments/${editData.image_path}`} 
                  alt={editData.name} 
                  className="w-full h-[200px] object-cover rounded-lg" 
                />
                <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="absolute bottom-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg text-gray-700 transition-all opacity-0 group-hover:opacity-100"
                >
                   <Upload size={18} />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-[120px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all"
              >
                {isUploading ? <Loader2 size={32} className="animate-spin text-[#c45c5c]" /> : <ImageIcon size={32} opacity={0.5} />}
                <p className="text-xs font-medium mt-2">{isUploading ? 'Uploading...' : 'Click to upload experiment image'}</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
            <div className="col-span-2 flex items-center gap-2 mb-2">
               <span 
                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: STAGE_COLORS[editData.stage]?.bg || '#f3f4f6',
                  color: STAGE_COLORS[editData.stage]?.text || '#4b5563',
                }}
              >
                {editData.stage}
              </span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                editData.priority === 'High' || editData.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                editData.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}>{editData.priority}</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Functional Tester</label>
              <input 
                className="w-full p-2 text-sm border-gray-200 rounded-md focus:ring-[#c45c5c] focus:border-[#c45c5c]" 
                value={editData.tester || ''} 
                onChange={(e) => setEditData({...editData, tester: e.target.value})}
                placeholder="Unassigned"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">FT Result</label>
              <select 
                className="w-full p-2 text-sm border-gray-200 rounded-md bg-white" 
                value={editData.ft_result || ''} 
                onChange={(e) => setEditData({...editData, ft_result: e.target.value})}
              >
                <option value="">Pending</option>
                <option value="Okay">Okay</option>
                <option value="Not Okay">Not Okay</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">FT Remarks</label>
              <textarea 
                rows={2}
                className="w-full p-2 text-sm border-gray-200 rounded-md" 
                value={editData.ft_remarks || ''} 
                onChange={(e) => setEditData({...editData, ft_remarks: e.target.value})}
                placeholder="Enter testing observation..."
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Solution Assignee</label>
              <input 
                className="w-full p-2 text-sm border-gray-200 rounded-md" 
                value={editData.sa || ''} 
                onChange={(e) => setEditData({...editData, sa: e.target.value})}
                placeholder="Unassigned"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Deadline Date</label>
              <input 
                type="date"
                className="w-full p-2 text-sm border-gray-200 rounded-md" 
                value={editData.deadline || ''} 
                onChange={(e) => setEditData({...editData, deadline: e.target.value})}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Engineering Link</label>
              <input 
                className="w-full p-2 text-sm border-gray-200 rounded-md" 
                value={editData.link || ''} 
                onChange={(e) => setEditData({...editData, link: e.target.value})}
                placeholder="Paste Drive or File URL"
              />
            </div>
          </div>

          <hr className="border-gray-100 mb-6" />

          {/* Timeline */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6">
              <Activity size={16} className="text-gray-400" /> Pipeline Progress
            </h3>
            <div className="relative border-l border-gray-200 ml-3 space-y-5">
              {STAGES_ORDER.map((s, idx) => {
                const isCompleted = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                
                return (
                  <div key={s} className="relative pl-6">
                    <div 
                      className={`absolute -left-[5.5px] top-1 w-[10px] h-[10px] rounded-full border-2 border-white ${
                        isCompleted ? 'bg-green-500' : isCurrent ? 'bg-[#c45c5c]' : 'bg-gray-200'
                      }`}
                    />
                    <div>
                      <p className={`text-[13px] font-bold ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>{s}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-3 shrink-0">
          <div className="flex gap-2">
             <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-md hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
             >
                {isSaving ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <Save size={16} className="text-gray-400" />}
                Save Changes
             </button>
             
             {actionObj && editData.stage !== 'Completed' && (
                <button 
                  onClick={() => openModal(actionObj.modal as any, { ...editData, experimentName: editData.name })}
                  className="flex-1 px-4 py-2.5 text-white text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 shadow-sm"
                  style={{ background: actionObj.color }}
                >
                  <UserPlus size={16} />
                  {actionObj.label}
                </button>
             )}
          </div>
          
          <button onClick={onClose} className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest py-1">
            Close Panel
          </button>
        </div>
      </div>
    </>
  );
}
