import { useNavigate } from 'react-router-dom';
import type { Button } from '../../../types';

interface ButtonCardProps {
  button: Button;
  onExecute: (button_id: string) => void;
  status: 'idle' | 'running' | 'success' | 'error';
}

export default function ButtonCard({ button, onExecute, status }: ButtonCardProps) {
  const navigate = useNavigate();

  const getScriptTypeInfo = (type: string) => {
    switch (type) {
      case 'shell':
        return { icon: '🐚', label: 'Shell', color: 'badge-warning' };
      case 'python':
        return { icon: '🐍', label: 'Python', color: 'badge-success' };
      case 'javascript':
        return { icon: '⚡', label: 'JavaScript', color: 'badge-info' };
      default:
        return { icon: '📦', label: type, color: 'badge-ghost' };
    }
  };

  const getStatusIndicator = () => {
    switch (status) {
      case 'running':
        return (
          <div className="flex items-center gap-1 text-warning">
            <span className="loading loading-spinner loading-xs"></span>
            <span className="text-xs">运行中</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-1 text-success">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs">成功</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 text-error">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs">失败</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-base-content/40">
            <div className="w-2 h-2 rounded-full bg-base-content/40"></div>
            <span className="text-xs">空闲</span>
          </div>
        );
    }
  };

  const scriptTypeInfo = getScriptTypeInfo(button.script_type);

  return (
    <div className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 h-full">
      <div className="card-body p-4 flex flex-col items-center text-center gap-3">
        {/* 图标 */}
        <div className="text-5xl">{button.icon || '📦'}</div>

        {/* 按钮名称 */}
        <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{button.name}</h3>

        {/* 脚本类型标签 */}
        <div className={`badge badge-sm ${scriptTypeInfo.color} gap-1`}>
          <span>{scriptTypeInfo.icon}</span>
          <span>{scriptTypeInfo.label}</span>
        </div>

        {/* 状态指示器 */}
        <div className="mt-auto">{getStatusIndicator()}</div>

        {/* 操作按钮 */}
        <div className="flex gap-2 w-full mt-2">
          <button
            className="btn btn-primary btn-sm flex-1"
            onClick={() => onExecute(button.id)}
            disabled={status === 'running'}
          >
            {status === 'running' ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                执行中
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
                执行
              </>
            )}
          </button>
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => navigate('/manage')}
            title="编辑"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
