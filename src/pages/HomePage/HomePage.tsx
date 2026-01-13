import { useState, useEffect, useRef } from 'react';
import { useLauncherStore } from '../../store/launcherStore';
import { useLogStore } from '../../store/logStore';
import { getAllButtons, executeScript, listenToLogs } from '../../api/tauri';
import ButtonCard from './components/ButtonCard';
import LogPanel from './components/LogPanel';

export default function HomePage() {
  const { buttons, setButtons } = useLauncherStore();
  const { addLog, togglePanel } = useLogStore();
  const [buttonStatuses, setButtonStatuses] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({});
  const [isLoading, setIsLoading] = useState(false);

  // 加载按钮列表
  useEffect(() => {
    loadButtons();
  }, []);

  // 监听日志事件 - 使用 useRef 确保只注册一次
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // 如果已经注册过，先清理旧的监听器
    if (listenerRef.current) {
      listenerRef.current();
      listenerRef.current = null;
    }

    const setupLogListener = async () => {
      const unlisten = await listenToLogs((log) => {
        addLog(log);
      });
      listenerRef.current = unlisten;
    };

    setupLogListener();

    return () => {
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
    };
  }, []); // 空依赖数组，确保只在挂载时执行一次

  const loadButtons = async () => {
    try {
      setIsLoading(true);
      const data = await getAllButtons();
      setButtons(data);

      // 初始化所有按钮状态为idle
      const statuses: Record<string, 'idle' | 'running' | 'success' | 'error'> = {};
      data.forEach(btn => {
        statuses[btn.id] = 'idle';
      });
      setButtonStatuses(statuses);
    } catch (error) {
      console.error('加载按钮失败:', error);
      addLog({
        id: crypto.randomUUID(),
        button_id: null,
        monitor_id: null,
        level: 'error',
        message: `加载按钮失败: ${error}`,
        timestamp: Math.floor(Date.now() / 1000),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async (button_id: string) => {
    try {
      // 设置状态为运行中
      setButtonStatuses(prev => ({ ...prev, [button_id]: 'running' }));

      // 自动打开日志面板
      togglePanel(true);

      // 执行脚本
      await executeScript(button_id);

      // 3秒后设置为成功状态，然后恢复idle
      setTimeout(() => {
        setButtonStatuses(prev => ({ ...prev, [button_id]: 'success' }));
        setTimeout(() => {
          setButtonStatuses(prev => ({ ...prev, [button_id]: 'idle' }));
        }, 3000);
      }, 1000);
    } catch (error) {
      console.error('执行脚本失败:', error);
      setButtonStatuses(prev => ({ ...prev, [button_id]: 'error' }));

      addLog({
        id: crypto.randomUUID(),
        button_id: button_id,
        monitor_id: null,
        level: 'error',
        message: `执行失败: ${error}`,
        timestamp: Math.floor(Date.now() / 1000),
      });

      // 5秒后恢复idle状态
      setTimeout(() => {
        setButtonStatuses(prev => ({ ...prev, [button_id]: 'idle' }));
      }, 5000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">启动台</h1>
              <p className="text-sm text-base-content/60 mt-1">
                点击按钮执行脚本
              </p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={loadButtons}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              刷新
            </button>
          </div>

          {/* 按钮网格 */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : buttons.length === 0 ? (
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
              <p className="text-lg mb-2">暂无按钮</p>
              <p className="text-sm">前往"管理"页面创建按钮</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {buttons.map((button) => (
                <ButtonCard
                  key={button.id}
                  button={button}
                  onExecute={handleExecute}
                  status={buttonStatuses[button.id] || 'idle'}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 日志面板 */}
      <LogPanel />
    </div>
  );
}
