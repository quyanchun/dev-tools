import { create } from 'zustand';
import { Button, Folder } from '../types';

interface LauncherState {
  buttons: Button[];
  folders: Folder[];
  setButtons: (buttons: Button[]) => void;
  setFolders: (folders: Folder[]) => void;
  addButton: (button: Button) => void;
  updateButton: (id: string, button: Partial<Button>) => void;
  deleteButton: (id: string) => void;
}

export const useLauncherStore = create<LauncherState>((set) => ({
  buttons: [],
  folders: [],
  setButtons: (buttons) => set({ buttons }),
  setFolders: (folders) => set({ folders }),
  addButton: (button) => set((state) => ({ buttons: [...state.buttons, button] })),
  updateButton: (id, updates) =>
    set((state) => ({
      buttons: state.buttons.map((btn) => (btn.id === id ? { ...btn, ...updates } : btn)),
    })),
  deleteButton: (id) =>
    set((state) => ({ buttons: state.buttons.filter((btn) => btn.id !== id) })),
}));
