import type { Monitor } from '../../../types';
import { getTargetStatusDisplay } from './monitorStatusUtils';

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

  // 使用 getTargetStatusDisplay 获取状态显示配置
  const statusDisplay = getTargetStatusDisplay(monitor);

  // 根据 is_active 决定卡片样式类
  // Requirements: 1.2, 1.3, 3.4
  const cardClassName = monitor.is_active
    ? 'glass-card cursor-pointer hover:scale-105 transition-transform duration-200 w-[120px] h-[120px]'
    : 'glass-card cursor-pointer hover:scale-105 transition-transform duration-200 w-[120px] h-[120px] monitor-card-inactive';

  // 根据动画类型获取动画类名
  const getAnimationClass = () => {
    if (!statusDisplay.animate) return '';
    return statusDisplay.animationType === 'pulse' ? 'animate-pulse' : 'animate-blink';
  };

  return (
    <div
      className={cardClassName}
      onClick={() => onShowDetails(monitor)}
    >
      <div className="p-3 flex flex-col h-full">
        {/* 图标区域 - 包含状态指示 */}
        <div className="flex-1 flex flex-col items-center justify-center mb-2">
          <div className="text-primary scale-75">{getMonitorIcon()}</div>
          {/* 目标状态指示器 - Requirements: 2.1, 2.2, 2.3, 2.4 */}
          <div className={`flex items-center gap-1 text-[10px] mt-1 ${statusDisplay.color}`}>
            <div className={`w-2 h-2 rounded-full ${statusDisplay.dot} ${getAnimationClass()}`}></div>
            <span>{statusDisplay.text}</span>
          </div>
        </div>

        {/* 名称 - 底部固定，与按钮和文件夹对齐 */}
        <div className="text-center h-4 flex items-center justify-center">
          <h3 className="font-semibold text-xs truncate px-1 leading-none" title={monitor.name}>
            {monitor.name}
          </h3>
        </div>
      </div>
    </div>
  );
}
