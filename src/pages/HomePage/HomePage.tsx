import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLauncherStore } from '../../store/launcherStore';
import { useMonitorStore } from '../../store/monitorStore';
import { useUnifiedStore } from '../../store/unifiedStore';
import { useLogStore } from '../../store/logStore';
import { 
  executeScript, 
  listenToLogs, 
  listenToMonitorStatus, 
  listenToMonitorAlert,
  deleteButton,
  deleteFolder,
  deleteMonitor,
} from '../../api/tauri';
import type { Monitor, Button, Folder } from '../../types';
import LogPanel from './components/LogPanel';
import MonitorDetailsModal from './components/MonitorDetailsModal';
import ButtonArea from './components/ButtonArea';
import SearchBar from './components/SearchBar';
import CreateFolderModal from './components/CreateFolderModal';
import EditFolderModal from './components/EditFolderModal';
import ConfirmModal from './components/ConfirmModal';
import DragDropWrapper from './components/DragDropWrapper';
import { ContextMenu } from '../../components/ContextMenu';

export default function HomePage() {
  const navigate = useNavigate();
  const { buttons, setButtons } = useLauncherStore();
  const { monitors, updateMonitorStatus } = useMonitorStore();
  const { fetchAllItems, getItemsByContainer } = useUnifiedStore();
  const { addLog, togglePanel } = useLogStore();
  
  const [buttonStatuses, setButtonStatuses] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 模态框状态
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [deletingButton, setDeletingButton] = useState<Button | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [deletingMonitor, setDeletingMonitor] = useState<Monitor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 全局右键菜单状态
  const [globalContextMenu, setGlobalContextMenu] = useState<{ x: number; y: number } | null>(null);

  // 初始化加载 - 使用统一存储
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 使用统一存储获取所有项目
      await fetchAllItems();
      
      // 初始化按钮状态
      const statuses: Record<string, 'idle' | 'running' | 'success' | 'error'> = {};
      buttons.forEach(btn => { statuses[btn.id] = 'idle'; });
      setButtonStatuses(statuses);
    } catch (error) {
      console.error('加载数据失败:', error);
      addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'error', message: `加载数据失败: ${error}`, timestamp: Math.floor(Date.now() / 1000) });
    } finally {
      setIsLoading(false);
    }
  };

  // 日志监听
  const listenerRef = useRef<(() => void) | null>(null);
  const monitorStatusListenerRef = useRef<(() => void) | null>(null);
  const monitorAlertListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const setup = async () => {
      listenerRef.current?.();
      listenerRef.current = await listenToLogs(addLog);
    };
    setup();
    return () => { listenerRef.current?.(); };
  }, []);

  useEffect(() => {
    const setup = async () => {
      monitorStatusListenerRef.current = await listenToMonitorStatus((status) => {
        updateMonitorStatus(status.monitor_id, { last_status: status.status, last_check_time: status.last_check_time });
      });
      monitorAlertListenerRef.current = await listenToMonitorAlert((alert) => {
        if (alert.message) {
          addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: alert.monitor_id, level: 'error', message: alert.message, timestamp: alert.last_check_time });
          togglePanel(true);
        }
      });
    };
    setup();
    return () => {
      monitorStatusListenerRef.current?.();
      monitorAlertListenerRef.current?.();
    };
  }, [updateMonitorStatus, addLog, togglePanel]);

  // 执行脚本
  const handleExecute = async (buttonId: string) => {
    try {
      setButtonStatuses(prev => ({ ...prev, [buttonId]: 'running' }));
      togglePanel(true);
      await executeScript(buttonId);
      setTimeout(() => {
        setButtonStatuses(prev => ({ ...prev, [buttonId]: 'success' }));
        setTimeout(() => setButtonStatuses(prev => ({ ...prev, [buttonId]: 'idle' })), 3000);
      }, 1000);
    } catch (error) {
      setButtonStatuses(prev => ({ ...prev, [buttonId]: 'error' }));
      addLog({ id: crypto.randomUUID(), button_id: buttonId, monitor_id: null, level: 'error', message: `执行失败: ${error}`, timestamp: Math.floor(Date.now() / 1000) });
      setTimeout(() => setButtonStatuses(prev => ({ ...prev, [buttonId]: 'idle' })), 5000);
    }
  };

  // 删除操作
  const handleDeleteButton = async () => {
    if (!deletingButton) return;
    setIsDeleting(true);
    try {
      await deleteButton(deletingButton.id);
      setButtons(buttons.filter(b => b.id !== deletingButton.id));
      addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'info', message: `按钮 "${deletingButton.name}" 已删除`, timestamp: Math.floor(Date.now() / 1000) });
    } catch (error) {
      addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'error', message: `删除失败: ${error}`, timestamp: Math.floor(Date.now() / 1000) });
    } finally {
      setIsDeleting(false);
      setDeletingButton(null);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;
    setIsDeleting(true);
    try {
      await deleteFolder(deletingFolder.id);
      await loadData(); // 重新加载以更新统一存储
      addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'info', message: `文件夹 "${deletingFolder.name}" 已删除`, timestamp: Math.floor(Date.now() / 1000) });
    } catch (error) {
      addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'error', message: `删除失败: ${error}`, timestamp: Math.floor(Date.now() / 1000) });
    } finally {
      setIsDeleting(false);
      setDeletingFolder(null);
    }
  };

  const handleDeleteMonitor = async () => {
    if (!deletingMonitor) return;
    setIsDeleting(true);
    try {
      await deleteMonitor(deletingMonitor.id);
      await loadData(); // 重新加载以更新统一存储
      addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'info', message: `监控 "${deletingMonitor.name}" 已删除`, timestamp: Math.floor(Date.now() / 1000) });
    } catch (error) {
      addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'error', message: `删除失败: ${error}`, timestamp: Math.floor(Date.now() / 1000) });
    } finally {
      setIsDeleting(false);
      setDeletingMonitor(null);
    }
  };

  // 从统一存储获取根级别项目并按位置排序
  const rootItems = getItemsByContainer(null);
  const hasContent = rootItems.length > 0;

  // 全局右键菜单处理 - 在空白区域显示新建文件夹选项
  const handleGlobalContextMenu = (e: React.MouseEvent) => {
    // 如果点击的是某个项目（按钮、文件夹、监控），不处理
    if ((e.target as HTMLElement).closest('[data-context-item]')) {
      return;
    }
    // 阻止默认右键菜单
    e.preventDefault();
    // 显示右键菜单
    setGlobalContextMenu({ x: e.clientX, y: e.clientY });
  };

  // 全局右键菜单项
  const globalMenuItems = [
    {
      label: '新建文件夹',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
      ),
      onClick: () => setIsCreateFolderModalOpen(true),
    },
    {
      label: '刷新',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
      onClick: () => loadData(),
    },
  ];

  return (
    <div className="h-full flex flex-col relative" onContextMenu={handleGlobalContextMenu}>
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1920px] mx-auto">
          {/* 搜索栏居中 */}
          <div className="flex justify-center mb-6">
            <SearchBar onSearch={setSearchQuery} />
          </div>

          {/* 内容区域 */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : !hasContent ? (
            <div className="flex flex-col items-center justify-center h-64 text-base-content/50">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-lg mb-2">暂无内容</p>
              <p className="text-sm">前往"管理"页面创建按钮或监控，右键空白处新建文件夹</p>
            </div>
          ) : (
            <DragDropWrapper>
              <ButtonArea
                onExecute={handleExecute}
                buttonStatuses={buttonStatuses}
                searchQuery={searchQuery}
                monitors={monitors}
                onShowMonitorDetails={setSelectedMonitor}
                onCreateFolder={() => setIsCreateFolderModalOpen(true)}
                onEditButton={(btn) => navigate(`/manage?edit=${btn.id}`)}
                onDeleteButton={setDeletingButton}
                onEditFolder={setEditingFolder}
                onDeleteFolder={setDeletingFolder}
                onEditMonitor={(monitor) => navigate(`/manage?editMonitor=${monitor.id}`)}
                onDeleteMonitor={setDeletingMonitor}
              />
            </DragDropWrapper>
          )}
        </div>
      </div>

      <LogPanel />

      <MonitorDetailsModal monitor={selectedMonitor} onClose={() => setSelectedMonitor(null)} />

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onSuccess={() => {
          loadData();
          addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'info', message: '文件夹创建成功', timestamp: Math.floor(Date.now() / 1000) });
        }}
      />

      <EditFolderModal
        folder={editingFolder}
        onClose={() => setEditingFolder(null)}
        onSuccess={() => {
          loadData();
          addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'info', message: '文件夹更新成功', timestamp: Math.floor(Date.now() / 1000) });
        }}
      />

      <ConfirmModal
        isOpen={!!deletingButton}
        title="删除按钮"
        message={`确定要删除按钮 "${deletingButton?.name}" 吗？`}
        confirmText="删除"
        danger
        isLoading={isDeleting}
        onConfirm={handleDeleteButton}
        onCancel={() => setDeletingButton(null)}
      />

      <ConfirmModal
        isOpen={!!deletingFolder}
        title="删除文件夹"
        message={`确定要删除文件夹 "${deletingFolder?.name}" 吗？`}
        confirmText="删除"
        danger
        isLoading={isDeleting}
        onConfirm={handleDeleteFolder}
        onCancel={() => setDeletingFolder(null)}
      />

      <ConfirmModal
        isOpen={!!deletingMonitor}
        title="删除监控"
        message={`确定要删除监控 "${deletingMonitor?.name}" 吗？`}
        confirmText="删除"
        danger
        isLoading={isDeleting}
        onConfirm={handleDeleteMonitor}
        onCancel={() => setDeletingMonitor(null)}
      />

      {/* 全局右键菜单 */}
      {globalContextMenu && (
        <ContextMenu
          x={globalContextMenu.x}
          y={globalContextMenu.y}
          items={globalMenuItems}
          onClose={() => setGlobalContextMenu(null)}
        />
      )}
    </div>
  );
}
