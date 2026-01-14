import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Button, Folder, Monitor } from '../types';
import { useLauncherStore } from './launcherStore';
import { useMonitorStore } from './monitorStore';

// ============================================================================
// Types
// ============================================================================

export type UnifiedItemType = 'monitor' | 'folder' | 'button';

export interface UnifiedItem {
  id: string;
  type: UnifiedItemType;
  position: number;
  folder_id: string | null;
  data: Monitor | Folder | Button;
}

export interface UnifiedPositionUpdate {
  id: string;
  item_type: UnifiedItemType;
  position: number;
  folder_id: string | null;
}

// ============================================================================
// Store Interface
// ============================================================================

interface UnifiedState {
  items: UnifiedItem[];
  isLoading: boolean;
  error: string | null;

  // Fetch all items from backend
  fetchAllItems: () => Promise<void>;

  // Get items for a specific container (folder_id or null for root)
  getItemsByContainer: (folderId: string | null) => UnifiedItem[];

  // Reorder items (drag and drop)
  reorderItems: (
    itemId: string,
    newPosition: number,
    newFolderId: string | null
  ) => Promise<void>;

  // CRUD operations
  addItem: (item: UnifiedItem) => void;
  updateItem: (id: string, updates: Partial<UnifiedItem>) => void;
  deleteItem: (id: string) => void;

  // Internal state setters
  setItems: (items: UnifiedItem[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert backend UnifiedItem format to frontend format
 */
function convertBackendItem(backendItem: any): UnifiedItem {
  const itemType = backendItem.item_type as UnifiedItemType;
  
  // Backend returns flat structure with item_type field
  // Extract all fields except item_type as the data
  const { item_type, ...data } = backendItem;

  return {
    id: data.id,
    type: itemType,
    position: data.position,
    folder_id: data.folder_id ?? null,
    data: data,
  };
}

/**
 * Sync unified store items with legacy stores
 */
function syncWithLegacyStores(items: UnifiedItem[]) {
  const monitors = items
    .filter((i) => i.type === 'monitor')
    .map((i) => i.data as Monitor);
  useMonitorStore.getState().setMonitors(monitors);

  const buttons = items
    .filter((i) => i.type === 'button')
    .map((i) => i.data as Button);
  useLauncherStore.getState().setButtons(buttons);

  const folders = items
    .filter((i) => i.type === 'folder')
    .map((i) => i.data as Folder);
  useLauncherStore.getState().setFolders(folders);
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useUnifiedStore = create<UnifiedState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  // Fetch all items from backend
  fetchAllItems: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch ALL items from backend (folderId: "__all__" means get all items including those in folders)
      // Note: Tauri converts camelCase to snake_case, so folderId becomes folder_id
      const backendItems = await invoke<any[]>('get_all_items', {
        folderId: '__all__',
      });

      // Convert backend format to frontend format
      const items = backendItems.map(convertBackendItem);

      // Sort by position
      items.sort((a, b) => a.position - b.position);

      set({ items, isLoading: false });

      // Sync with legacy stores
      syncWithLegacyStores(items);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to fetch items';
      set({ error: errorMsg, isLoading: false });
      console.error('[UnifiedStore] Failed to fetch items:', error);
    }
  },

  // Get items for a specific container
  getItemsByContainer: (folderId: string | null) => {
    const { items } = get();
    return items
      .filter((item) => item.folder_id === folderId)
      .sort((a, b) => a.position - b.position);
  },

  // Reorder items (drag and drop)
  reorderItems: async (
    itemId: string,
    newPosition: number,
    newFolderId: string | null
  ) => {
    const { items } = get();
    set({ error: null });

    // Store previous state for rollback
    const previousItems = [...items];

    try {
      // Find the dragged item
      const draggedItem = items.find((i) => i.id === itemId);
      if (!draggedItem) {
        throw new Error('Item not found');
      }

      // Get all items in the target container
      const containerItems = items.filter((i) => i.folder_id === newFolderId);

      // Remove dragged item from its current position
      const otherItems = containerItems.filter((i) => i.id !== itemId);

      // Insert at new position
      otherItems.splice(newPosition, 0, {
        ...draggedItem,
        folder_id: newFolderId,
      });

      // Recalculate all positions for items in the target container
      const updates: UnifiedPositionUpdate[] = otherItems.map((item, index) => ({
        id: item.id,
        item_type: item.type,
        position: index,
        folder_id: newFolderId,
      }));

      // If item moved between containers, also recalculate source container
      if (draggedItem.folder_id !== newFolderId) {
        const sourceContainerItems = items
          .filter(
            (i) => i.folder_id === draggedItem.folder_id && i.id !== itemId
          )
          .sort((a, b) => a.position - b.position);

        const sourceUpdates: UnifiedPositionUpdate[] = sourceContainerItems.map(
          (item, index) => ({
            id: item.id,
            item_type: item.type,
            position: index,
            folder_id: draggedItem.folder_id,
          })
        );

        updates.push(...sourceUpdates);
      }

      // Optimistically update UI
      const updatedItems = items.map((item) => {
        const update = updates.find((u) => u.id === item.id);
        if (update) {
          // Update both the UnifiedItem fields and the nested data object
          const updatedData = { ...item.data, folder_id: update.folder_id, position: update.position };
          return {
            ...item,
            position: update.position,
            folder_id: update.folder_id,
            data: updatedData,
          };
        }
        return item;
      });

      set({ items: updatedItems });

      // Persist to backend
      await invoke('update_unified_positions', { updates });

      // Sync with legacy stores
      syncWithLegacyStores(updatedItems);
    } catch (error) {
      // Rollback on failure
      set({ items: previousItems });

      const errorMsg =
        error instanceof Error
          ? error.message
          : 'Failed to update item positions';
      set({ error: errorMsg });
      console.error('Failed to reorder items:', error);
      throw error;
    }
  },

  // Add item
  addItem: (item: UnifiedItem) => {
    set((state) => {
      const newItems = [...state.items, item].sort(
        (a, b) => a.position - b.position
      );
      syncWithLegacyStores(newItems);
      return { items: newItems };
    });
  },

  // Update item
  updateItem: (id: string, updates: Partial<UnifiedItem>) => {
    set((state) => {
      const newItems = state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      syncWithLegacyStores(newItems);
      return { items: newItems };
    });
  },

  // Delete item
  deleteItem: (id: string) => {
    set((state) => {
      const newItems = state.items.filter((item) => item.id !== id);
      syncWithLegacyStores(newItems);
      return { items: newItems };
    });
  },

  // Internal setters
  setItems: (items: UnifiedItem[]) => {
    set({ items });
    syncWithLegacyStores(items);
  },
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
}));
