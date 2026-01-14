import { useEffect, useState } from 'react';
import type { Button } from '../../../types';

interface ButtonCardProps {
  button: Button;
  onExecute: (button_id: string) => void;
  status: 'idle' | 'running' | 'success' | 'error';
}

export default function ButtonCard({ button, onExecute, status }: ButtonCardProps) {
  const [statusClass, setStatusClass] = useState('');

  // 处理状态动画类
  useEffect(() => {
    if (status === 'success') {
      setStatusClass('status-success');
      const timer = setTimeout(() => setStatusClass(''), 500);
      return () => clearTimeout(timer);
    } else if (status === 'error') {
      setStatusClass('status-error');
      const timer = setTimeout(() => setStatusClass(''), 500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div
      className={`glass-card launchpad-button ${statusClass}`}
      onClick={() => status !== 'running' && onExecute(button.id)}
    >
      {/* 图标 - macOS Launchpad 尺寸 */}
      <div className={`text-6xl ${status === 'running' ? 'animate-pulse' : ''}`}>
        {button.icon || '📦'}
      </div>

      {/* 名称 - 简洁显示 */}
      <h3 className="font-medium text-xs line-clamp-2 text-center w-full px-1">
        {button.name}
      </h3>
    </div>
  );
}
