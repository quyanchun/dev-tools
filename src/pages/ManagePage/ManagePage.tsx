import { useState, useEffect } from 'react';
import { useLauncherStore } from '../../store/launcherStore';
import { createButton, getAllButtons, updateButton, deleteButton } from '../../api/tauri';
import type { Button } from '../../types';
import ButtonList from './components/ButtonList';
import ButtonForm from './components/ButtonForm';

export default function ManagePage() {
  const { buttons, setButtons } = useLauncherStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<Button | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Button | null>(null);

  // 加载按钮列表
  useEffect(() => {
    loadButtons();
  }, []);

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
    setEditingButton(null);
    setIsFormOpen(true);
  };

  const handleEdit = (button: Button) => {
    setEditingButton(button);
    setIsFormOpen(true);
  };

  const handleSave = async (buttonData: Omit<Button, 'id' | 'created_at' | 'updated_at'>) => {
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

  const handleDelete = (button: Button) => {
    setDeleteConfirm(button);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setIsLoading(true);
      await deleteButton(deleteConfirm.id);
      await loadButtons();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('删除按钮失败:', error);
      alert('删除按钮失败: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-6 border-b border-base-300">
        <div>
          <h1 className="text-2xl font-bold">按钮管理</h1>
          <p className="text-sm text-base-content/60 mt-1">
            创建和管理执行按钮
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={isLoading}
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
          创建新按钮
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && !isFormOpen ? (
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : isFormOpen ? (
          <div className="max-w-3xl mx-auto">
            <div className="mb-4">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingButton(null);
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
            <ButtonForm
              button={editingButton}
              onSave={handleSave}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingButton(null);
              }}
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <ButtonList
              buttons={buttons}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">确认删除</h3>
            <p className="py-4">
              确定要删除按钮 <strong>"{deleteConfirm.name}"</strong> 吗？
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
