import { create } from 'zustand';

interface DrawerData {
  experimentId?: string;
  [key: string]: any;
}

interface DrawerStore {
  isOpen: boolean;
  data: DrawerData;
  onOpen: (data?: DrawerData) => void;
  onClose: () => void;
}

export const useDrawer = create<DrawerStore>((set) => ({
  isOpen: false,
  data: {},
  onOpen: (data = {}) => set({ isOpen: true, data }),
  onClose: () => set({ isOpen: false, data: {} }),
}));
