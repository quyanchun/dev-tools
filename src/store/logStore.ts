import { create } from 'zustand';
import { LogEntry } from '../types';

interface LogState {
  logs: LogEntry[];
  isPanelOpen: boolean;
  maxLogs: number;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  togglePanel: (open?: boolean) => void;
  setMaxLogs: (max: number) => void;
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  isPanelOpen: false,
  maxLogs: 1000,
  addLog: (log) =>
    set((state) => {
      const newLogs = [...state.logs, log];
      // 保持最大日志数量限制
      if (newLogs.length > state.maxLogs) {
        newLogs.shift();
      }
      return { logs: newLogs };
    }),
  clearLogs: () => set({ logs: [] }),
  togglePanel: (open) => set((state) => ({ isPanelOpen: open !== undefined ? open : !state.isPanelOpen })),
  setMaxLogs: (max) => set({ maxLogs: max }),
}));
