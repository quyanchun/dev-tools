import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  language: string;
  maxLogs: number;
  autoStartMonitors: boolean;
  executeConfirmation: boolean;
  executeTimeout: number;
  notificationsEnabled: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: string) => void;
  setMaxLogs: (max: number) => void;
  setAutoStartMonitors: (enabled: boolean) => void;
  setExecuteConfirmation: (enabled: boolean) => void;
  setExecuteTimeout: (timeout: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  loadSettings: () => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  theme: 'system' as Theme,
  language: 'zh-CN',
  maxLogs: 1000,
  autoStartMonitors: true,
  executeConfirmation: false,
  executeTimeout: 30000,
  notificationsEnabled: true,
};

// 应用主题到 DOM
function applyTheme(theme: Theme) {
  const effectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_SETTINGS,

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('app-theme', theme);
    applyTheme(theme);
  },

  setLanguage: (lang) => {
    set({ language: lang });
    localStorage.setItem('app-language', lang);
  },

  setMaxLogs: (max) => {
    set({ maxLogs: max });
    localStorage.setItem('app-maxLogs', max.toString());
  },

  setAutoStartMonitors: (enabled) => {
    set({ autoStartMonitors: enabled });
    localStorage.setItem('app-autoStartMonitors', enabled.toString());
  },

  setExecuteConfirmation: (enabled) => {
    set({ executeConfirmation: enabled });
    localStorage.setItem('app-executeConfirmation', enabled.toString());
  },

  setExecuteTimeout: (timeout) => {
    set({ executeTimeout: timeout });
    localStorage.setItem('app-executeTimeout', timeout.toString());
  },

  setNotificationsEnabled: (enabled) => {
    set({ notificationsEnabled: enabled });
    localStorage.setItem('app-notificationsEnabled', enabled.toString());
  },

  loadSettings: () => {
    const theme = (localStorage.getItem('app-theme') as Theme) || DEFAULT_SETTINGS.theme;
    const language = localStorage.getItem('app-language') || DEFAULT_SETTINGS.language;
    const maxLogs = parseInt(localStorage.getItem('app-maxLogs') || '') || DEFAULT_SETTINGS.maxLogs;
    const autoStartMonitors = localStorage.getItem('app-autoStartMonitors') === 'true';
    const executeConfirmation = localStorage.getItem('app-executeConfirmation') === 'true';
    const executeTimeout = parseInt(localStorage.getItem('app-executeTimeout') || '') || DEFAULT_SETTINGS.executeTimeout;
    const notificationsEnabled = localStorage.getItem('app-notificationsEnabled') !== 'false';

    set({
      theme,
      language,
      maxLogs,
      autoStartMonitors,
      executeConfirmation,
      executeTimeout,
      notificationsEnabled,
    });

    applyTheme(theme);
  },

  resetSettings: () => {
    set(DEFAULT_SETTINGS);
    localStorage.removeItem('app-theme');
    localStorage.removeItem('app-language');
    localStorage.removeItem('app-maxLogs');
    localStorage.removeItem('app-autoStartMonitors');
    localStorage.removeItem('app-executeConfirmation');
    localStorage.removeItem('app-executeTimeout');
    localStorage.removeItem('app-notificationsEnabled');
    applyTheme(DEFAULT_SETTINGS.theme);
  },
}));

// 监听系统主题变化
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const { theme } = useSettingsStore.getState();
    if (theme === 'system') {
      applyTheme('system');
    }
  });
}
