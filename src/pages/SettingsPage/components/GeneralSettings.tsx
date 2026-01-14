import { useSettingsStore } from '../../../store/settingsStore';
import { useLogStore } from '../../../store/logStore';

export default function GeneralSettings() {
  const {
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

  return (
    <div className="space-y-6">
      {/* 执行设置 */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">执行设置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">执行前确认</p>
              <p className="text-sm opacity-60">执行脚本前显示确认对话框</p>
            </div>
            <input
              type="checkbox"
              className="toggle"
              checked={executeConfirmation}
              onChange={(e) => setExecuteConfirmation(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">通知</p>
              <p className="text-sm opacity-60">执行完成后显示通知</p>
            </div>
            <input
              type="checkbox"
              className="toggle"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* 监控设置 */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">监控设置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自动启动监控</p>
              <p className="text-sm opacity-60">应用启动时自动开始监控</p>
            </div>
            <input
              type="checkbox"
              className="toggle"
              checked={autoStartMonitors}
              onChange={(e) => setAutoStartMonitors(e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* 日志设置 */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">日志设置</h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2">
              <span className="font-medium">最大日志数量</span>
              <span className="text-sm opacity-60 ml-2">当前: {maxLogs}</span>
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              className="range range-primary"
              value={maxLogs}
              onChange={(e) => setMaxLogs(parseInt(e.target.value))}
            />
            <div className="flex justify-between text-xs opacity-60 mt-1">
              <span>100</span>
              <span>5000</span>
            </div>
          </div>

          <div>
            <button
              className="btn btn-error btn-sm"
              onClick={handleClearLogs}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              清空所有日志
            </button>
          </div>
        </div>
      </div>

      {/* 危险区域 */}
      <div className="glass-card p-6 border-2 border-error/30">
        <h3 className="text-lg font-semibold mb-4 text-error">危险区域</h3>
        <div className="space-y-4">
          <div>
            <p className="font-medium mb-2">重置所有设置</p>
            <p className="text-sm opacity-60 mb-3">
              将所有设置恢复为默认值，此操作不可恢复
            </p>
            <button
              className="btn btn-error btn-sm"
              onClick={handleResetSettings}
            >
              重置设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
