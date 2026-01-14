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
      className={`glass-card cursor-pointer transition-all duration-300 w-[120px] h-[120px] hover:scale-105 ${statusClass}`}
      onClick={() => status !== 'running' && onExecute(button.id)}
    >
      <div className="relative h-full p-3 flex flex-col">
        {/* 图标区域 */}
        <div className={`flex-1 flex items-center justify-center text-5xl mb-2 ${status === 'running' ? 'animate-pulse' : ''}`}>
          {button.icon || '📦'}
        </div>

        {/* 名称 - 底部固定，与文件夹对齐 */}
        <div className="text-center h-4 flex items-center justify-center">
          <h3 className="font-semibold text-xs truncate px-1 leading-none">
            {button.name}
          </h3>
        </div>
      </div>
    </div>
  );
}
