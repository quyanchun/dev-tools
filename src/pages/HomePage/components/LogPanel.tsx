import { useEffect, useRef } from 'react';
import { useLogStore } from '../../../store/logStore';

export default function LogPanel() {
  const { logs, isPanelOpen, togglePanel, clearLogs } = useLogStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (isPanelOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPanelOpen]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return (
          <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-info" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const getLogBgColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-error/10';
      case 'warning':
        return 'bg-warning/10';
      default:
        return '';
    }
  };

  return (
    <div className="border-t border-base-300 bg-base-200">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-2 bg-base-100 border-b border-base-300">
        <button
          className="flex items-center gap-2 font-semibold hover:text-primary transition-colors"
          onClick={() => togglePanel()}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isPanelOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span>日志面板</span>
          {logs.length > 0 && (
            <span className="badge badge-sm badge-primary">{logs.length}</span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-xs"
            onClick={clearLogs}
            disabled={logs.length === 0}
            title="清除日志"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            清除
          </button>
        </div>
      </div>

      {/* 日志内容 */}
      {isPanelOpen && (
        <div className="h-64 overflow-y-auto p-4 space-y-2 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-base-content/50">
              <p>暂无日志</p>
            </div>
          ) : (
            <>
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 p-2 rounded ${getLogBgColor(log.level)}`}
                >
                  <div className="flex-shrink-0 mt-0.5">{getLevelIcon(log.level)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-base-content/60 mb-1">
                      <span>{formatTime(log.timestamp)}</span>
                      {log.button_id && <span className="badge badge-xs">按钮执行</span>}
                    </div>
                    <div className="whitespace-pre-wrap break-words">{log.message}</div>
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
