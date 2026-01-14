import { useEffect } from 'react';
import { useSettingsStore, type Theme } from '../store/settingsStore';
import { useLogStore } from '../store/logStore';
import { invoke } from '@tauri-apps/api/core';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    theme,
    setTheme,
    maxLogs,
    setMaxLogs,
    autoStartMonitors,
    setAutoStartMonitors,
    executeConfirmation,
    setExecuteConfirmation,
    notificationsEnabled,
    setNotificationsEnabled,
    resetSettings,
  } = useSettingsStore();

  const { clearLogs } = useLogStore();

  // Escape 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleClearLogs = () => {
    if (confirm('确定要清空所有日志吗？此操作不可恢复。')) {
      clearLogs();
    }
  };

  const handleResetSettings = () => {
    if (confirm('确定要重置所有设置吗？此操作不可恢复。')) {
      resetSettings();
    }
  };

  const handleExit = async () => {
    if (confirm('确定要退出应用吗？')) {
      await invoke('exit_app');
    }
  };

  const themes: Array<{ value: Theme; label: string; icon: React.ReactNode }> = [
    {
      value: 'light',
      label: '亮色',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      value: 'dark',
      label: '暗色',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      value: 'system',
      label: '系统',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-modal w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-xl">设置</h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* 主题设置 */}
          <div className="glass-card p-4">
            <h4 className="font-semibold mb-3">外观</h4>
            <div className="flex gap-2">
              {themes.map((t) => (
                <button
                  key={t.value}
                  className={`flex-1 btn btn-sm gap-2 ${theme === t.value ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTheme(t.value)}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 执行设置 */}
          <div className="glass-card p-4">
            <h4 className="font-semibold mb-3">执行设置</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">执行前确认</p>
                  <p className="text-xs opacity-60">执行脚本前显示确认对话框</p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={executeConfirmation}
                  onChange={(e) => setExecuteConfirmation(e.target.checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">通知</p>
                  <p className="text-xs opacity-60">执行完成后显示通知</p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                />
              </div>
            </div>
          </div>

          {/* 监控设置 */}
          <div className="glass-card p-4">
            <h4 className="font-semibold mb-3">监控设置</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">自动启动监控</p>
                <p className="text-xs opacity-60">应用启动时自动开始监控</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={autoStartMonitors}
                onChange={(e) => setAutoStartMonitors(e.target.checked)}
              />
            </div>
          </div>

          {/* 日志设置 */}
          <div className="glass-card p-4">
            <h4 className="font-semibold mb-3">日志设置</h4>
            <div className="space-y-3">
              <div>
                <label className="block mb-2">
                  <span className="text-sm font-medium">最大日志数量</span>
                  <span className="text-xs opacity-60 ml-2">{maxLogs}</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  className="range range-primary range-sm"
                  value={maxLogs}
                  onChange={(e) => setMaxLogs(parseInt(e.target.value))}
                />
              </div>
              <button className="btn btn-error btn-sm" onClick={handleClearLogs}>
                清空日志
              </button>
            </div>
          </div>

          {/* 关于 */}
          <div className="glass-card p-4">
            <h4 className="font-semibold mb-3">关于</h4>
            <div className="text-sm space-y-1 opacity-70">
              <p>DevTools v1.0.0</p>
              <p>Tauri v2 + React 18</p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between pt-2">
            <button className="btn btn-error btn-sm" onClick={handleExit}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              退出应用
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleResetSettings}>
              重置设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
