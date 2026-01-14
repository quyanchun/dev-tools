import type { Monitor } from '../../../types';

interface MonitorDetailsModalProps {
  monitor: Monitor | null;
  onClose: () => void;
}

export default function MonitorDetailsModal({ monitor, onClose }: MonitorDetailsModalProps) {
  if (!monitor) return null;

  const getMonitorIcon = () => {
    if (monitor.icon) return monitor.icon;
    switch (monitor.monitor_type) {
      case 'process':
        return '📊';
      case 'api':
        return '🌐';
      case 'port':
        return '🔌';
      default:
        return '📊';
    }
  };

  const getMonitorTypeLabel = () => {
    switch (monitor.monitor_type) {
      case 'process':
        return '进程监控';
      case 'api':
        return 'API监控';
      case 'port':
        return '端口监控';
      default:
        return monitor.monitor_type;
    }
  };

  const getStatusBadge = () => {
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

  const getTargetDisplay = () => {
    if (monitor.monitor_type === 'process') {
      return monitor.target;
    } else if (monitor.monitor_type === 'api') {
      try {
        const config = JSON.parse(monitor.target);
        return `${config.method || 'GET'} ${config.url}`;
      } catch {
        return monitor.target;
      }
    } else if (monitor.monitor_type === 'port') {
      return monitor.target;
    }
    return monitor.target;
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{getMonitorIcon()}</div>
            <div>
              <h3 className="font-bold text-xl">{monitor.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge badge-sm">{getMonitorTypeLabel()}</span>
                {getStatusBadge()}
              </div>
            </div>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* 配置信息 */}
        <div className="space-y-4">
          <div className="card bg-base-200">
            <div className="card-body p-4">
              <h4 className="font-semibold mb-2">监控配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/60">监控类型:</span>
                  <span>{getMonitorTypeLabel()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">检查间隔:</span>
                  <span>{monitor.check_interval} 秒</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">失败告警:</span>
                  <span>{monitor.alert_on_failure ? '已启用' : '已禁用'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">创建时间:</span>
                  <span>{formatDate(monitor.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 目标信息 */}
          <div className="card bg-base-200">
            <div className="card-body p-4">
              <h4 className="font-semibold mb-2">监控目标</h4>
              <div className="text-sm bg-base-300 p-3 rounded font-mono break-all">
                {getTargetDisplay()}
              </div>
              {monitor.expected_result && (
                <div className="mt-2">
                  <span className="text-xs text-base-content/60">期望结果: </span>
                  <span className="text-sm">{monitor.expected_result}</span>
                </div>
              )}
            </div>
          </div>

          {/* 状态信息 */}
          <div className="card bg-base-200">
            <div className="card-body p-4">
              <h4 className="font-semibold mb-2">运行状态</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/60">当前状态:</span>
                  <span>{getStatusBadge()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">最后检查:</span>
                  <span>{formatDate(monitor.last_check_time)}</span>
                </div>
                {monitor.last_status && (
                  <div className="flex justify-between">
                    <span className="text-base-content/60">检查结果:</span>
                    <span className={monitor.last_status === 'running' ? 'text-success' : 'text-error'}>
                      {monitor.last_status === 'running' ? '正常' : '异常'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
