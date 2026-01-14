import { useState } from 'react';
import { createFolder } from '../../../api/tauri';
import type { Folder } from '../../../types';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateFolderModal({ isOpen, onClose, onSuccess }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 常用图标
  const commonIcons = ['📁', '📂', '🗂️', '📋', '📦', '🎯', '⚙️', '🔧', '💼', '🎨', '📊', '🚀', '⭐', '🔥', '💡', '🎮'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('请输入文件夹名称');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const folder: Folder = {
        id: crypto.randomUUID(),
        name: name.trim(),
        icon: icon,
        position: Math.floor(Date.now() / 1000), // 使用秒级时间戳，而不是毫秒
        created_at: Math.floor(Date.now() / 1000),
      };

      await createFolder(folder);

      // 重置表单
      setName('');
      setIcon('📁');

      // 通知父组件刷新
      onSuccess();
      onClose();
    } catch (err) {
      setError(`创建失败: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setIcon('📁');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">创建新文件夹</h3>

        <form onSubmit={handleSubmit}>
          {/* 文件夹名称 */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">文件夹名称</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入文件夹名称..."
              className="input input-bordered w-full"
              autoFocus
            />
          </div>

          {/* 图标选择 */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">选择图标</span>
            </label>
            <div className="grid grid-cols-8 gap-2">
              {commonIcons.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`btn btn-square ${
                    icon === emoji ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 自定义图标 */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text text-xs">或输入自定义 Emoji</span>
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="输入 Emoji..."
              className="input input-bordered input-sm w-full"
              maxLength={2}
            />
          </div>

          {/* 预览 */}
          <div className="alert alert-info mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{icon}</span>
              <div>
                <p className="font-semibold">{name || '文件夹名称'}</p>
                <p className="text-xs opacity-70">预览效果</p>
              </div>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="alert alert-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* 按钮 */}
          <div className="modal-action">
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
                  创建中...
                </>
              ) : (
                '创建文件夹'
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
}
