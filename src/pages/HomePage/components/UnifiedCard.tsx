import type { Button, Monitor } from '../../../types';

type CardItem = 
  | { type: 'button'; data: Button }
  | { type: 'monitor'; data: Monitor };

interface UnifiedCardProps {
  item: CardItem;
  status?: 'idle' | 'running' | 'success' | 'error';
  onExecute?: (id: string) => void;
  onShowDetails?: (monitor: Monitor) => void;
}

export default function UnifiedCard({ item, status = 'idle', onExecute, onShowDetails }: UnifiedCardProps) {
  if (item.type === 'button') {
    return (
      <ButtonCardContent 
        button={item.data} 
        status={status} 
        onExecute={onExecute} 
      />
    );
  }
  
  return (
    <MonitorCardContent 
      monitor={item.data} 
      onShowDetails={onShowDetails} 
    />
  );
}

// 按钮卡片内容
function ButtonCardContent({ 
  button, 
  status, 
  onExecute 
}: { 
  button: Button; 
  status: 'idle' | 'running' | 'success' | 'error';
  onExecute?: (id: string) => void;
}) {
  return (
    <div
      className="glass-card launchpad-button"
      onClick={() => status !== 'running' && onExecute?.(button.id)}
    >
      <div className={`text-6xl ${status === 'running' ? 'animate-pulse' : ''}`}>
        {button.icon || '📦'}
      </div>
      <h3 className="font-medium text-xs line-clamp-2 text-center w-full px-1">
        {button.name}
      </h3>
    </div>
  );
}

// 监控卡片内容
function MonitorCardContent({ 
  monitor, 
  onShowDetails 
}: { 
  monitor: Monitor;
  onShowDetails?: (monitor: Monitor) => void;
}) {
  const getStatusDisplay = () => {
    switch (monitor.last_status) {
      case 'running':
        return { color: 'bg-success', text: '运行中', animate: 'animate-pulse' };
      case 'error':
        return { color: 'bg-error', text: '异常', animate: 'animate-blink' };
      case 'checking':
        return { color: 'bg-warning', text: '检查中', animate: 'animate-pulse' };
      default:
        return { color: 'bg-info', text: '活动', animate: '' };
    }
  };

  const status = getStatusDisplay();

  return (
    <div
      className="glass-card launchpad-button relative"
      onClick={() => onShowDetails?.(monitor)}
    >
      {/* 状态指示器 */}
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${status.color} ${status.animate}`} />
      
      <div className="text-5xl">
        {monitor.icon || (monitor.monitor_type === 'api' ? '🌐' : '📊')}
      </div>
      <h3 className="font-medium text-xs line-clamp-2 text-center w-full px-1">
        {monitor.name}
      </h3>
    </div>
  );
}

export type { CardItem };
