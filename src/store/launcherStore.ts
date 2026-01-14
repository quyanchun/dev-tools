import { create } from 'zustand';
import { Button, Folder } from '../types';

/**
 * @deprecated This store is maintained for backward compatibility with CRUD operations.
 * For positioning and ordering operations, use the unified store (unifiedStore.ts) instead.
 * 
 * The unified store provides:
 * - Unified positioning across all item types (monitors, folders, buttons)
 * - Consistent drag-and-drop reordering
 * - Atomic position updates
 * 
 * This store should only be used for:
 * - Simple CRUD operations (add, update, delete)
 * - Accessing button/folder data without position concerns
 * 
 * Migration guide:
 * - For reordering: Use unifiedStore.reorderItems()
 * - For fetching items: Use unifiedStore.getItemsByContainer()
 * - For position updates: Use unifiedStore.reorderItems()
 */
interface LauncherState {
  buttons: Button[];
  folders: Folder[];
  setButtons: (buttons: Button[]) => void;
  setFolders: (folders: Folder[]) => void;
  addButton: (button: Button) => void;
  updateButton: (id: string, button: Partial<Button>) => void;
  deleteButton: (id: string) => void;
  /** @deprecated Use unifiedStore.reorderItems() instead */
  reorderButtons: (newOrder: Button[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, folder: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
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
  reorderButtons: (newOrder) => set({ buttons: newOrder }),
  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
  updateFolder: (id, updates) =>
    set((state) => ({
      folders: state.folders.map((folder) => (folder.id === id ? { ...folder, ...updates } : folder)),
    })),
  deleteFolder: (id) =>
    set((state) => ({ folders: state.folders.filter((folder) => folder.id !== id) })),
}));
