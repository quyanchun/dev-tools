import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLauncherStore } from '../../store/launcherStore';
import { useMonitorStore } from '../../store/monitorStore';
import { useLogStore } from '../../store/logStore';
import { 
  getAllButtons, 
  getAllFolders, 
  executeScript, 
  listenToLogs, 
  listenToMonitorStatus, 
  listenToMonitorAlert,
  deleteButton,
  deleteFolder,
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

export default function HomePage() {
  const navigate = useNavigate();
  const { buttons, folders, setButtons, setFolders } = useLauncherStore();
  const { monitors, fetchMonitors, updateMonitorStatus } = useMonitorStore();
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
  const [isDeleting, setIsDeleting] = useState(false);

  // 初始化加载
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [buttonsData, foldersData] = await Promise.all([
        getAllButtons(),
        getAllFolders(),
        fetchMonitors(),
      ]);
      setButtons(buttonsData);
      setFolders(foldersData);
      
      const statuses: Record<string, 'idle' | 'running' | 'success' | 'error'> = {};
      buttonsData.forEach(btn => { statuses[btn.id] = 'idle'; });
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
      await loadData();
      addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'info', message: `文件夹 "${deletingFolder.name}" 已删除`, timestamp: Math.floor(Date.now() / 1000) });
    } catch (error) {
      addLog({ id: crypto.randomUUID(), button_id: null, monitor_id: null, level: 'error', message: `删除失败: ${error}`, timestamp: Math.floor(Date.now() / 1000) });
    } finally {
      setIsDeleting(false);
      setDeletingFolder(null);
    }
  };

  const hasContent = buttons.length > 0 || folders.length > 0 || monitors.some(m => m.is_active);

  return (
    <div className="h-full flex flex-col relative">
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
            <DragDropWrapper 
              monitors={monitors} 
              onMonitorsChange={(updatedMonitors) => {
                // 直接更新整个 monitors 数组
                useMonitorStore.getState().setMonitors(updatedMonitors);
              }}
            >
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
    </div>
  );
}
