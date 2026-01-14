import { useState, useEffect } from 'react';
import { useLauncherStore } from '../../store/launcherStore';
import { useMonitorStore } from '../../store/monitorStore';
import { createButton, getAllButtons, updateButton, deleteButton } from '../../api/tauri';
import type { Button, Monitor } from '../../types';
import ButtonList from './components/ButtonList';
import ButtonForm from './components/ButtonForm';
import MonitorList from './components/MonitorList';
import MonitorForm from './components/MonitorForm';

type TabType = 'buttons' | 'monitors';

export default function ManagePage() {
  const { buttons, setButtons } = useLauncherStore();
  const {
    monitors,
    isLoading: monitorsLoading,
    fetchMonitors,
    createMonitor,
    updateMonitor: updateMonitorStore,
    deleteMonitor: deleteMonitorStore
  } = useMonitorStore();

  const [activeTab, setActiveTab] = useState<TabType>('buttons');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<Button | null>(null);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Button | Monitor | null>(null);

  // 加载按钮列表
  useEffect(() => {
    loadButtons();
  }, []);

  // 加载监控列表
  useEffect(() => {
    if (activeTab === 'monitors') {
      fetchMonitors();
    }
  }, [activeTab, fetchMonitors]);

  const loadButtons = async () => {
    try {
      setIsLoading(true);
      const data = await getAllButtons();
      setButtons(data);
    } catch (error) {
      console.error('加载按钮失败:', error);
      alert('加载按钮失败: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    if (activeTab === 'buttons') {
      setEditingButton(null);
    } else {
      setEditingMonitor(null);
    }
    setIsFormOpen(true);
  };

  const handleEditButton = (button: Button) => {
    setEditingButton(button);
    setIsFormOpen(true);
  };

  const handleEditMonitor = (monitor: Monitor) => {
    setEditingMonitor(monitor);
    setIsFormOpen(true);
  };

  const handleSaveButton = async (buttonData: Omit<Button, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsLoading(true);

      if (editingButton) {
        // 更新现有按钮
        const updatedButton: Button = {
          ...editingButton,
          ...buttonData,
          updated_at: Math.floor(Date.now() / 1000),
        };
        await updateButton(editingButton.id, updatedButton);
      } else {
        // 创建新按钮
        const newButton: Button = {
          id: crypto.randomUUID(),
          ...buttonData,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000),
        };
        await createButton(newButton);
      }

      // 重新加载列表
      await loadButtons();
      setIsFormOpen(false);
      setEditingButton(null);
    } catch (error) {
      console.error('保存按钮失败:', error);
      alert('保存按钮失败: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMonitor = async (monitorData: Omit<Monitor, 'id' | 'created_at'>) => {
    try {
      if (editingMonitor) {
        // 更新现有监控
        await updateMonitorStore(editingMonitor.id, monitorData);
      } else {
        // 创建新监控
        await createMonitor(monitorData);
      }

      setIsFormOpen(false);
      setEditingMonitor(null);
    } catch (error) {
      console.error('保存监控失败:', error);
      alert('保存监控失败: ' + error);
    }
  };

  const handleDelete = (item: Button | Monitor) => {
    setDeleteConfirm(item);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setIsLoading(true);

      if ('script_type' in deleteConfirm) {
        // 删除按钮
        await deleteButton(deleteConfirm.id);
        await loadButtons();
      } else {
        // 删除监控
        await deleteMonitorStore(deleteConfirm.id);
      }

      setDeleteConfirm(null);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    return activeTab === 'buttons' ? '按钮管理' : '监控管理';
  };

  const getDescription = () => {
    return activeTab === 'buttons' ? '创建和管理执行按钮' : '创建和管理监控任务';
  };

  const getCreateButtonText = () => {
    return activeTab === 'buttons' ? '创建新按钮' : '创建新监控';
  };

  const isCurrentLoading = activeTab === 'buttons' ? isLoading : monitorsLoading;

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="glass-panel border-b border-base-300 rounded-none">
        <div className="flex items-center justify-between p-8 max-w-[1920px] mx-auto">
          <div>
            <h1 className="text-2xl font-bold">{getTitle()}</h1>
            <p className="text-sm text-base-content/60 mt-1">
              {getDescription()}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={isCurrentLoading}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {getCreateButtonText()}
          </button>
        </div>

        {/* 标签页 */}
        <div className="tabs tabs-boxed bg-transparent px-8 max-w-[1920px] mx-auto">
          <button
            className={`tab ${activeTab === 'buttons' ? 'tab-active' : ''}`}
            onClick={() => {
              setActiveTab('buttons');
              setIsFormOpen(false);
              setEditingButton(null);
              setEditingMonitor(null);
            }}
          >
            📦 按钮
          </button>
          <button
            className={`tab ${activeTab === 'monitors' ? 'tab-active' : ''}`}
            onClick={() => {
              setActiveTab('monitors');
              setIsFormOpen(false);
              setEditingButton(null);
              setEditingMonitor(null);
            }}
          >
            📊 监控
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-[1920px] mx-auto">
        {isCurrentLoading && !isFormOpen ? (
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : isFormOpen ? (
          <div className="max-w-3xl mx-auto glass-card p-8">
            <div className="mb-4">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingButton(null);
                  setEditingMonitor(null);
                }}
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                返回列表
              </button>
            </div>
            {activeTab === 'buttons' ? (
              <ButtonForm
                button={editingButton}
                onSave={handleSaveButton}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingButton(null);
                }}
              />
            ) : (
              <MonitorForm
                monitor={editingMonitor}
                onSave={handleSaveMonitor}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingMonitor(null);
                }}
              />
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {activeTab === 'buttons' ? (
              <ButtonList
                buttons={buttons}
                onEdit={handleEditButton}
                onDelete={handleDelete}
              />
            ) : (
              <MonitorList
                monitors={monitors}
                onEdit={handleEditMonitor}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <dialog className="modal modal-open">
          <div className="modal-box glass-modal">
            <h3 className="font-bold text-lg">确认删除</h3>
            <p className="py-4">
              确定要删除{activeTab === 'buttons' ? '按钮' : '监控'} <strong>"{deleteConfirm.name}"</strong> 吗？
              <br />
              此操作无法撤销。
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteConfirm(null)}
                disabled={isLoading}
              >
                取消
              </button>
              <button
                className="btn btn-error"
                onClick={confirmDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  '删除'
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setDeleteConfirm(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
