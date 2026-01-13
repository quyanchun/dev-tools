import type { Button } from '../../../types';

interface ButtonListProps {
  buttons: Button[];
  onEdit: (button: Button) => void;
  onDelete: (button: Button) => void;
}

export default function ButtonList({ buttons, onEdit, onDelete }: ButtonListProps) {
  const getScriptTypeLabel = (type: string) => {
    switch (type) {
      case 'shell':
        return '🐚 Shell';
      case 'python':
        return '🐍 Python';
      case 'javascript':
        return '⚡ JavaScript';
      default:
        return type;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  if (buttons.length === 0) {
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
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-lg">暂无按钮</p>
        <p className="text-sm">点击"创建新按钮"开始创建</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {buttons.map((button) => (
        <div key={button.id} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* 图标 */}
                <div className="text-3xl">
                  {button.icon || '📦'}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{button.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-base-content/60">
                    <span className="badge badge-sm">{getScriptTypeLabel(button.script_type)}</span>
                    <span>创建于: {formatDate(button.created_at)}</span>
                  </div>

                  {/* 脚本预览 */}
                  <div className="mt-2">
                    <div className="text-xs text-base-content/50 mb-1">脚本预览:</div>
                    <pre className="text-xs bg-base-200 p-2 rounded overflow-x-auto max-h-20 overflow-y-auto">
                      {button.script_content.split('\n').slice(0, 3).join('\n')}
                      {button.script_content.split('\n').length > 3 && '\n...'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 ml-4">
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => onEdit(button)}
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
                  onClick={() => onDelete(button)}
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
