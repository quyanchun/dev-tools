import { useState, useEffect, useRef } from 'react';
import { useLauncherStore } from '../../store/launcherStore';
import { useMonitorStore } from '../../store/monitorStore';
import { useLogStore } from '../../store/logStore';
import { getAllButtons, getAllFolders, executeScript, listenToLogs, listenToMonitorStatus, listenToMonitorAlert } from '../../api/tauri';
import type { Monitor } from '../../types';
import LogPanel from './components/LogPanel';
import StatusArea from './components/StatusArea';
import MonitorDetailsModal from './components/MonitorDetailsModal';
import ButtonArea from './components/ButtonArea';
import SearchBar from './components/SearchBar';
import CreateFolderModal from './components/CreateFolderModal';
import DragDropWrapper from './components/DragDropWrapper';

export default function HomePage() {
  // folders is used in ButtonArea component
  // @ts-ignore - folders is used in ButtonArea component via store
  const { buttons, folders, setButtons, setFolders } = useLauncherStore();
  const { monitors, fetchMonitors, updateMonitorStatus } = useMonitorStore();
  const { addLog, togglePanel } = useLogStore();
  const [buttonStatuses, setButtonStatuses] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);

  // 加载按钮和文件夹列表
  useEffect(() => {
    loadButtons();
    loadFolders();
    loadMonitors();
  }, []);

  // 监听日志事件 - 使用 useRef 确保只注册一次
  const listenerRef = useRef<(() => void) | null>(null);
  const monitorStatusListenerRef = useRef<(() => void) | null>(null);
  const monitorAlertListenerRef = useRef<(() => void) | null>(null);

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

  // 监听监控状态更新
  useEffect(() => {
    const setupMonitorListeners = async () => {
      // 监听状态更新
      const unlistenStatus = await listenToMonitorStatus((status) => {
        updateMonitorStatus(status.monitor_id, {
          last_status: status.status,
          last_check_time: status.last_check_time,
        });
      });
      monitorStatusListenerRef.current = unlistenStatus;

      // 监听告警
      const unlistenAlert = await listenToMonitorAlert((alert) => {
        // 显示告警通知
        if (alert.message) {
          addLog({
            id: crypto.randomUUID(),
            button_id: null,
            monitor_id: alert.monitor_id,
            level: 'error',
            message: alert.message,
            timestamp: alert.last_check_time,
          });
          // 自动打开日志面板
          togglePanel(true);
        }
      });
      monitorAlertListenerRef.current = unlistenAlert;
    };

    setupMonitorListeners();

    return () => {
      if (monitorStatusListenerRef.current) {
        monitorStatusListenerRef.current();
      }
      if (monitorAlertListenerRef.current) {
        monitorAlertListenerRef.current();
      }
    };
  }, [updateMonitorStatus, addLog, togglePanel]);

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

  const loadFolders = async () => {
    try {
      const data = await getAllFolders();
      setFolders(data);
    } catch (error) {
      console.error('加载文件夹失败:', error);
    }
  };

  const loadMonitors = async () => {
    try {
      await fetchMonitors();
    } catch (error) {
      console.error('加载监控失败:', error);
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

  const handleRefresh = () => {
    loadButtons();
    loadFolders();
    loadMonitors();
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-[1920px] mx-auto">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">启动台</h1>
              <p className="text-sm text-base-content/60 mt-1">
                拖拽按钮调整位置，点击执行脚本
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SearchBar onSearch={setSearchQuery} />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setIsCreateFolderModalOpen(true)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                新建文件夹
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleRefresh}
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
          </div>

          {/* 监控状态区 */}
          <StatusArea
            monitors={monitors}
            onShowDetails={setSelectedMonitor}
          />

          {/* 按钮区标题 */}
          {monitors.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>按钮区</span>
                <span className="text-base-content/60 text-sm font-normal">(执行)</span>
              </h2>
            </div>
          )}

          {/* 按钮网格 - 使用新的 ButtonArea 组件 */}
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
            <DragDropWrapper>
              <ButtonArea
                onExecute={handleExecute}
                buttonStatuses={buttonStatuses}
                searchQuery={searchQuery}
              />
            </DragDropWrapper>
          )}
        </div>
      </div>

      {/* 日志面板 */}
      <LogPanel />

      {/* 监控详情模态框 */}
      <MonitorDetailsModal
        monitor={selectedMonitor}
        onClose={() => setSelectedMonitor(null)}
      />

      {/* 创建文件夹模态框 */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onSuccess={() => {
          loadFolders();
          addLog({
            id: crypto.randomUUID(),
            button_id: null,
            monitor_id: null,
            level: 'info',
            message: '文件夹创建成功',
            timestamp: Math.floor(Date.now() / 1000),
          });
        }}
      />
    </div>
  );
}
