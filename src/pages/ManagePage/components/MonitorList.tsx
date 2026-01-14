import { useState } from 'react';
import type { Monitor } from '../../../types';
import { useMonitorStore } from '../../../store/monitorStore';

interface MonitorListProps {
  monitors: Monitor[];
  onEdit: (monitor: Monitor) => void;
  onDelete: (monitor: Monitor) => void;
}

export default function MonitorList({ monitors, onEdit, onDelete }: MonitorListProps) {
  const { startMonitor, stopMonitor } = useMonitorStore();
  const [loadingMonitors, setLoadingMonitors] = useState<Set<string>>(new Set());

  const handleToggle = async (monitor: Monitor) => {
    setLoadingMonitors(prev => new Set(prev).add(monitor.id));
    try {
      if (monitor.is_active) {
        await stopMonitor(monitor.id);
      } else {
        await startMonitor(monitor.id);
      }
    } catch (error) {
      console.error('Failed to toggle monitor:', error);
      alert('操作失败: ' + error);
    } finally {
      setLoadingMonitors(prev => {
        const newSet = new Set(prev);
        newSet.delete(monitor.id);
        return newSet;
      });
    }
  };
  const getMonitorTypeLabel = (type: string) => {
    switch (type) {
      case 'process':
        return '📊 进程监控';
      case 'api':
        return '🌐 API监控';
      case 'port':
        return '🔌 端口监控';
      default:
        return type;
    }
  };

  const getStatusBadge = (monitor: Monitor) => {
    if (!monitor.is_active) {
      return <span className="badge badge-ghost">已停止</span>;
    }

    switch (monitor.last_status) {
      case 'running':
        return <span className="badge badge-success">运行中</span>;
      case 'error':
        return <span className="badge badge-error">异常</span>;
      case 'checking':
        return <span className="badge badge-warning">检查中</span>;
      default:
        return <span className="badge badge-info">活动</span>;
    }
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return '从未';
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const getTargetDisplay = (monitor: Monitor) => {
    if (monitor.monitor_type === 'process') {
      return monitor.target;
    } else {
      // Try to parse API config
      try {
        const config = JSON.parse(monitor.target);
        return `${config.method || 'GET'} ${config.url}`;
      } catch {
        return monitor.target;
      }
    }
  };

  if (monitors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-base-content/50">
        <svg
          className="w-16 h-16 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-lg">暂无监控</p>
        <p className="text-sm">点击"创建新监控"开始创建</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {monitors.map((monitor) => (
        <div key={monitor.id} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* 图标 */}
                <div className="text-3xl">
                  {monitor.icon || (
                    monitor.monitor_type === 'process' ? '📊' :
                    monitor.monitor_type === 'api' ? '🌐' :
                    '🔌'
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg truncate">{monitor.name}</h3>
                    {getStatusBadge(monitor)}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-sm text-base-content/60">
                    <span className="badge badge-sm">{getMonitorTypeLabel(monitor.monitor_type)}</span>
                    <span>间隔: {monitor.check_interval}秒</span>
                    {monitor.alert_on_failure && (
                      <span className="badge badge-sm badge-warning">告警已启用</span>
                    )}
                  </div>

                  {/* 目标信息 */}
                  <div className="mt-2">
                    <div className="text-xs text-base-content/50 mb-1">监控目标:</div>
                    <div className="text-sm bg-base-200 p-2 rounded truncate">
                      {getTargetDisplay(monitor)}
                    </div>
                  </div>

                  {/* 最后检查时间 */}
                  {monitor.last_check_time && (
                    <div className="mt-2 text-xs text-base-content/50">
                      最后检查: {formatDate(monitor.last_check_time)}
                    </div>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 ml-4">
                <button
                  className={`btn btn-sm ${monitor.is_active ? 'btn-error' : 'btn-success'}`}
                  onClick={() => handleToggle(monitor)}
                  title={monitor.is_active ? '停止监控' : '启动监控'}
                  disabled={loadingMonitors.has(monitor.id)}
                >
                  {loadingMonitors.has(monitor.id) ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : monitor.is_active ? (
                    '停止'
                  ) : (
                    '启动'
                  )}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => onEdit(monitor)}
                  title="编辑"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  className="btn btn-sm btn-ghost text-error"
                  onClick={() => onDelete(monitor)}
                  title="删除"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
