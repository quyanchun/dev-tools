import type { Monitor } from '../../../types';

interface MonitorCardProps {
  monitor: Monitor;
  onShowDetails: (monitor: Monitor) => void;
}

export default function MonitorCard({ monitor, onShowDetails }: MonitorCardProps) {
  const getMonitorIcon = () => {
    if (monitor.icon) return monitor.icon;
    switch (monitor.monitor_type) {
      case 'process':
        return (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'api':
        return (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        );
      case 'port':
        return (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  };

  const getStatusDisplay = () => {
    switch (monitor.last_status) {
      case 'running':
        return {
          icon: (
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          ),
          text: '运行中',
          color: 'text-success',
        };
      case 'error':
        return {
          icon: (
            <div className="w-2 h-2 rounded-full bg-error animate-blink"></div>
          ),
          text: '异常',
          color: 'text-error',
        };
      case 'checking':
        return {
          icon: (
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse"></div>
          ),
          text: '检查中',
          color: 'text-warning',
        };
      default:
        return {
          icon: (
            <div className="w-2 h-2 rounded-full bg-info"></div>
          ),
          text: '活动',
          color: 'text-info',
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div
      className="glass-card cursor-pointer hover:scale-105 transition-transform duration-200 w-[120px] h-[120px]"
      onClick={() => onShowDetails(monitor)}
    >
      <div className="p-3 flex flex-col items-center justify-between h-full">
        {/* 图标 */}
        <div className="text-primary mb-1 scale-75">{getMonitorIcon()}</div>

        {/* 名称和类型 */}
        <div className="text-center flex-1 flex flex-col justify-center">
          <h3 className="font-semibold text-xs truncate w-full mb-0.5" title={monitor.name}>
            {monitor.name}
          </h3>
          <div className="text-[10px] text-base-content/60">
            <div>{monitor.check_interval}s</div>
          </div>
        </div>

        {/* 状态指示 */}
        <div className={`flex items-center gap-1.5 text-[10px] ${status.color}`}>
          {status.icon}
          <span>{status.text}</span>
        </div>
      </div>
    </div>
  );
}
