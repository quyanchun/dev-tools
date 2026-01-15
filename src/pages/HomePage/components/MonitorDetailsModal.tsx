import { useEffect } from 'react';
import type { Monitor } from '../../../types';

interface MonitorDetailsModalProps {
  monitor: Monitor | null;
  onClose: () => void;
}

export default function MonitorDetailsModal({ monitor, onClose }: MonitorDetailsModalProps) {
  // Escape 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && monitor) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [monitor, onClose]);

  if (!monitor) return null;

  const getMonitorIcon = () => {
    if (monitor.icon) return <span className="text-4xl">{monitor.icon}</span>;
    switch (monitor.monitor_type) {
      case 'process':
        return (
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'api':
        return (
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        );
      case 'port':
        return (
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
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

  const getStatusDisplay = () => {
    if (!monitor.is_active) {
      return {
        text: '未监控',
        dotClass: 'bg-base-300',
        textClass: 'text-base-content/50',
      };
    }
    if (monitor.last_status === 'running') {
      return {
        text: '运行中',
        dotClass: 'bg-success',
        textClass: 'text-success',
      };
    }
    return {
      text: '已停止',
      dotClass: 'bg-error',
      textClass: 'text-error',
    };
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

  const statusDisplay = getStatusDisplay();

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
        className="glass-modal w-full max-w-lg p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              {getMonitorIcon()}
            </div>
            <div>
              <h3 className="font-bold text-xl">{monitor.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-base-200 text-base-content/70">
                  {getMonitorTypeLabel()}
                </span>
                <div className={`flex items-center gap-1.5 text-xs ${statusDisplay.textClass}`}>
                  <div className={`w-2 h-2 rounded-full ${statusDisplay.dotClass} ${monitor.is_active && monitor.last_status === 'running' ? 'animate-pulse' : ''}`}></div>
                  <span>{statusDisplay.text}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost hover:bg-base-200/50"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 配置信息 */}
        <div className="space-y-4">
          {/* 监控目标 */}
          <div className="rounded-xl bg-white/50 dark:bg-slate-700/30 border border-white/30 dark:border-white/10 p-4">
            <h4 className="font-medium text-sm text-base-content/60 mb-2">监控目标</h4>
            <div className="text-sm bg-base-200/50 dark:bg-slate-800/50 p-3 rounded-lg font-mono break-all">
              {getTargetDisplay()}
            </div>
            {monitor.expected_result && (
              <div className="mt-3 text-sm">
                <span className="text-base-content/60">期望结果: </span>
                <span className="text-base-content/80">{monitor.expected_result}</span>
              </div>
            )}
          </div>

          {/* 监控配置 */}
          <div className="rounded-xl bg-white/50 dark:bg-slate-700/30 border border-white/30 dark:border-white/10 p-4">
            <h4 className="font-medium text-sm text-base-content/60 mb-3">监控配置</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/60">检查间隔</span>
                <span className="font-medium">{monitor.check_interval} 秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">失败告警</span>
                <span className={`font-medium ${monitor.alert_on_failure ? 'text-success' : 'text-base-content/50'}`}>
                  {monitor.alert_on_failure ? '已启用' : '已禁用'}
                </span>
              </div>
            </div>
          </div>

          {/* 运行状态 */}
          <div className="rounded-xl bg-white/50 dark:bg-slate-700/30 border border-white/30 dark:border-white/10 p-4">
            <h4 className="font-medium text-sm text-base-content/60 mb-3">运行状态</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/60">监控状态</span>
                <span className={`font-medium ${monitor.is_active ? 'text-success' : 'text-base-content/50'}`}>
                  {monitor.is_active ? '已启动' : '已停止'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">目标状态</span>
                <span className={`font-medium ${statusDisplay.textClass}`}>
                  {statusDisplay.text}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">最后检查</span>
                <span className="text-base-content/80">{formatDate(monitor.last_check_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">创建时间</span>
                <span className="text-base-content/80">{formatDate(monitor.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-base-200/50">
          <button className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
