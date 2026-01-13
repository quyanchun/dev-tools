import { create } from 'zustand';
import { Monitor } from '../types';

interface MonitorState {
  monitors: Monitor[];
  setMonitors: (monitors: Monitor[]) => void;
  addMonitor: (monitor: Monitor) => void;
  updateMonitor: (id: string, monitor: Partial<Monitor>) => void;
  deleteMonitor: (id: string) => void;
}

export const useMonitorStore = create<MonitorState>((set) => ({
  monitors: [],
  setMonitors: (monitors) => set({ monitors }),
  addMonitor: (monitor) => set((state) => ({ monitors: [...state.monitors, monitor] })),
  updateMonitor: (id, updates) =>
    set((state) => ({
      monitors: state.monitors.map((mon) => (mon.id === id ? { ...mon, ...updates } : mon)),
    })),
  deleteMonitor: (id) =>
    set((state) => ({ monitors: state.monitors.filter((mon) => mon.id !== id) })),
}));
