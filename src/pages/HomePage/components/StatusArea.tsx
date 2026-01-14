import type { Monitor } from '../../../types';
import MonitorCard from './MonitorCard';

interface StatusAreaProps {
  monitors: Monitor[];
  onShowDetails: (monitor: Monitor) => void;
}

export default function StatusArea({ monitors, onShowDetails }: StatusAreaProps) {
  // 只显示已启动的监控
  const activeMonitors = monitors.filter(m => m.is_active);

  if (activeMonitors.length === 0) {
    return null; // Don't show the section if there are no active monitors
  }

  return (
    <div className="mb-8">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span>状态区</span>
          <span className="text-base-content/60 text-sm font-normal">(监控)</span>
        </h2>
        <div className="text-sm text-base-content/60">
          {activeMonitors.length} 个监控运行中
        </div>
      </div>

      {/* 监控卡片网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-6">
        {activeMonitors.map((monitor) => (
          <MonitorCard
            key={monitor.id}
            monitor={monitor}
            onShowDetails={onShowDetails}
          />
        ))}
      </div>

      {/* 分隔线 */}
      <div className="divider my-8"></div>
    </div>
  );
}
