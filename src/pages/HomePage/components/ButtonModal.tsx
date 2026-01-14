import { useState, useEffect, useCallback } from 'react';
import { createButton, updateButton } from '../../../api/tauri';
import type { Button } from '../../../types';

interface ButtonModalProps {
  isOpen: boolean;
  button?: Button | null;  // null表示创建模式，有值表示编辑模式
  onClose: () => void;
  onSuccess: () => void;
}

type ScriptType = 'shell' | 'python' | 'javascript';

const SCRIPT_PLACEHOLDERS: Record<ScriptType, string> = {
  shell: '#!/bin/bash\necho "Hello World"',
  python: '#!/usr/bin/env python3\nprint("Hello World")',
  javascript: 'console.log("Hello World");',
};

export default function ButtonModal({ isOpen, button, onClose, onSuccess }: ButtonModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [scriptType, setScriptType] = useState<ScriptType>('shell');
  const [scriptContent, setScriptContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!button;

  // 重置表单
  const resetForm = useCallback(() => {
    setName('');
    setIcon('');
    setScriptType('shell');
    setScriptContent('');
    setError('');
  }, []);

  // 编辑模式下预填充表单
  useEffect(() => {
    if (isOpen && button) {
      setName(button.name);
      setIcon(button.icon || '');
      setScriptType(button.script_type);
      setScriptContent(button.script_content);
      setError('');
    } else if (isOpen && !button) {
      resetForm();
    }
  }, [isOpen, button, resetForm]);

  // Escape 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('按钮名称不能为空');
      return false;
    }
    if (!scriptContent.trim()) {
      setError('脚本内容不能为空');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 使用 ?? 运算符确保 folder_id 正确保留（即使是 null 也要保留，只有 undefined 时才使用默认值）
      const buttonData: Button = {
        id: button?.id ?? crypto.randomUUID(),
        name: name.trim(),
        icon: icon.trim() || null,
        script_type: scriptType,
        script_content: scriptContent,
        folder_id: button?.folder_id ?? null,
        position: button?.position ?? Math.floor(Date.now() / 1000),
        created_at: button?.created_at ?? Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };

      if (isEditMode && button) {
        await updateButton(button.id, buttonData);
      } else {
        await createButton(buttonData);
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(`${isEditMode ? '更新' : '创建'}失败: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={handleClose}
    >
      <div
        className="glass-modal w-full max-w-lg p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-xl mb-6">
          {isEditMode ? '编辑按钮' : '创建新按钮'}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* 按钮名称 */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">按钮名称</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入按钮名称..."
              className="input input-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary"
              autoFocus
            />
          </div>

          {/* 图标 (emoji) */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">图标 (emoji)</span>
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🚀"
              className="input input-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary"
              maxLength={4}
            />
          </div>

          {/* 脚本类型 */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">脚本类型</span>
            </label>
            <select
              value={scriptType}
              onChange={(e) => setScriptType(e.target.value as ScriptType)}
              className="select select-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary"
            >
              <option value="shell">Shell</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>

          {/* 脚本内容 */}
          <div className="form-control mb-5">
            <label className="label">
              <span className="label-text font-medium">脚本内容</span>
            </label>
            <textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              placeholder={SCRIPT_PLACEHOLDERS[scriptType]}
              className="textarea textarea-bordered w-full h-32 bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary font-mono text-sm"
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {isEditMode ? '更新中...' : '创建中...'}
                </>
              ) : (
                isEditMode ? '更新' : '创建'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
