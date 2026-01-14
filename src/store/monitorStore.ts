import { create } from 'zustand';
import { Monitor } from '../types';
import * as tauriApi from '../api/tauri';

/**
 * @deprecated This store is maintained for backward compatibility with monitor-specific operations.
 * For positioning and ordering operations, use the unified store (unifiedStore.ts) instead.
 * 
 * The unified store provides:
 * - Unified positioning across all item types (monitors, folders, buttons)
 * - Consistent drag-and-drop reordering
 * - Atomic position updates
 * 
 * This store should only be used for:
 * - Monitor-specific CRUD operations (create, update, delete)
 * - Monitor control operations (start, stop)
 * - Monitor status updates from event listeners
 * - Accessing monitor data without position concerns
 * 
 * Migration guide:
 * - For reordering: Use unifiedStore.reorderItems()
 * - For fetching items: Use unifiedStore.getItemsByContainer()
 * - For position updates: Use unifiedStore.reorderItems()
 */
interface MonitorState {
  monitors: Monitor[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMonitors: () => Promise<void>;
  createMonitor: (monitor: Omit<Monitor, 'id' | 'created_at'>) => Promise<void>;
  updateMonitor: (id: string, monitor: Partial<Monitor>) => Promise<void>;
  deleteMonitor: (id: string) => Promise<void>;
  startMonitor: (id: string) => Promise<void>;
  stopMonitor: (id: string) => Promise<void>;
  updateMonitorStatus: (id: string, status: Partial<Monitor>) => void;

  // Internal state setters
  setMonitors: (monitors: Monitor[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMonitorStore = create<MonitorState>((set, get) => ({
  monitors: [],
  isLoading: false,
  error: null,

  // Fetch all monitors from backend
  fetchMonitors: async () => {
    set({ isLoading: true, error: null });
    try {
      const monitors = await tauriApi.getAllMonitors();
      set({ monitors, isLoading: false });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch monitors';
      set({ error: errorMsg, isLoading: false });
      console.error('Failed to fetch monitors:', error);
    }
  },

  // Create a new monitor
  createMonitor: async (monitorData) => {
    set({ isLoading: true, error: null });
    try {
      // Create monitor object with default values
      const monitor: Monitor = {
        ...monitorData,
        id: '', // Will be set by backend
        created_at: Date.now(),
      };

      const createdMonitor = await tauriApi.createMonitor(monitor);
      set((state) => ({
        monitors: [...state.monitors, createdMonitor],
        isLoading: false,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create monitor';
      set({ error: errorMsg, isLoading: false });
      console.error('Failed to create monitor:', error);
      throw error;
    }
  },

  // Update an existing monitor
  updateMonitor: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const monitor = get().monitors.find((m) => m.id === id);
      if (!monitor) {
        throw new Error('Monitor not found');
      }

      const updatedMonitor = { ...monitor, ...updates };
      await tauriApi.updateMonitor(id, updatedMonitor);

      set((state) => ({
        monitors: state.monitors.map((m) => (m.id === id ? updatedMonitor : m)),
        isLoading: false,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update monitor';
      set({ error: errorMsg, isLoading: false });
      console.error('Failed to update monitor:', error);
      throw error;
    }
  },

  // Delete a monitor
  deleteMonitor: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await tauriApi.deleteMonitor(id);
      set((state) => ({
        monitors: state.monitors.filter((m) => m.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete monitor';
      set({ error: errorMsg, isLoading: false });
      console.error('Failed to delete monitor:', error);
      throw error;
    }
  },

  // Start a monitor
  startMonitor: async (id) => {
    set({ error: null });
    try {
      await tauriApi.startMonitor(id);
      // Update local state to reflect monitor is active
      set((state) => ({
        monitors: state.monitors.map((m) =>
          m.id === id ? { ...m, is_active: true } : m
        ),
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start monitor';
      set({ error: errorMsg });
      console.error('Failed to start monitor:', error);
      throw error;
    }
  },

  // Stop a monitor
  stopMonitor: async (id) => {
    set({ error: null });
    try {
      await tauriApi.stopMonitor(id);
      // Update local state to reflect monitor is inactive
      set((state) => ({
        monitors: state.monitors.map((m) =>
          m.id === id ? { ...m, is_active: false } : m
        ),
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to stop monitor';
      set({ error: errorMsg });
      console.error('Failed to stop monitor:', error);
      throw error;
    }
  },

  // Update monitor status (called from event listeners)
  updateMonitorStatus: (id, status) => {
    set((state) => ({
      monitors: state.monitors.map((m) =>
        m.id === id ? { ...m, ...status } : m
      ),
    }));
  },

  // Internal setters
  setMonitors: (monitors) => set({ monitors }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
