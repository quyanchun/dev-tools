import { useState, useEffect } from 'react';
import { updateFolder } from '../../../api/tauri';
import type { Folder } from '../../../types';

interface EditFolderModalProps {
  folder: Folder | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditFolderModal({ folder, onClose, onSuccess }: EditFolderModalProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (folder) {
      setName(folder.name);
    }
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!folder) return;

    if (!name.trim()) {
      setError('请输入文件夹名称');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updatedFolder: Folder = {
        ...folder,
        name: name.trim(),
      };

      await updateFolder(folder.id, updatedFolder);
      onSuccess();
      onClose();
    } catch (err) {
      setError(`更新失败: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!folder) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={handleClose}
    >
      <div 
        className="glass-modal w-full max-w-md p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-xl mb-6">编辑文件夹</h3>

        <form onSubmit={handleSubmit}>
          {/* 文件夹名称 */}
          <div className="form-control mb-5">
            <label className="label">
              <span className="label-text font-medium">文件夹名称</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入文件夹名称..."
              className="input input-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary"
              autoFocus
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-error/10 border border-error/30 rounded-xl p-3 mb-5 flex items-center gap-2 text-error">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
