import { create } from 'zustand';

export type ModalType = 
  | 'workflow'
  | 'assign_ft'
  | 'record_ft'
  | 'assign_sa'
  | 'submit_handover'
  | 'accept_handover'
  | 'submit_design'
  | 'approve_design'
  | 'satwik_review'
  | 'upload_link'
  | 'procurement_check'
  | 'add_experiment'
  | 'logout'
  | null;

interface ModalData {
  experimentId?: string;
  experimentName?: string;
  currentAssignee?: string;
  [key: string]: any;
}

interface ModalStore {
  type: ModalType;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ type: null, isOpen: false, data: {} }),
}));
