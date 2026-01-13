import { useState, useEffect } from 'react';
import type { Button } from '../../../types';

interface ButtonFormProps {
  button?: Button | null;
  onSave: (button: Omit<Button, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

export default function ButtonForm({ button, onSave, onCancel }: ButtonFormProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [scriptType, setScriptType] = useState<'shell' | 'python' | 'javascript'>('shell');
  const [scriptContent, setScriptContent] = useState('');
  const [errors, setErrors] = useState<{ name?: string; scriptContent?: string }>({});

  useEffect(() => {
    if (button) {
      setName(button.name);
      setIcon(button.icon || '');
      setScriptType(button.script_type as 'shell' | 'python' | 'javascript');
      setScriptContent(button.script_content);
    }
  }, [button]);

  const validate = () => {
    const newErrors: { name?: string; scriptContent?: string } = {};

    if (!name.trim()) {
      newErrors.name = '按钮名称不能为空';
    }

    if (!scriptContent.trim()) {
      newErrors.scriptContent = '脚本内容不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSave({
      name: name.trim(),
      icon: icon.trim() || null,
      script_type: scriptType,
      script_content: scriptContent.trim(),
      folder_id: null,
      position: button?.position || 0,
    });
  };

  const getPlaceholder = () => {
    switch (scriptType) {
      case 'shell':
        return '#!/bin/bash\necho "Hello World"';
      case 'python':
        return 'print("Hello World")';
      case 'javascript':
        return 'console.log("Hello World");';
      default:
        return '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 基本信息 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-lg">基本信息</h3>

          {/* 按钮名称 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">按钮名称 *</span>
            </label>
            <input
              type="text"
              placeholder="输入按钮名称"
              className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.name}</span>
              </label>
            )}
          </div>

          {/* 图标 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">图标（emoji）</span>
            </label>
            <input
              type="text"
              placeholder="🚀"
              className="input input-bordered"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
            />
          </div>

          {/* 脚本类型 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">脚本类型 *</span>
            </label>
            <div className="flex gap-2">
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="scriptType"
                  className="radio radio-primary"
                  checked={scriptType === 'shell'}
                  onChange={() => setScriptType('shell')}
                />
                <span className="label-text">🐚 Shell</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="scriptType"
                  className="radio radio-primary"
                  checked={scriptType === 'python'}
                  onChange={() => setScriptType('python')}
                />
                <span className="label-text">🐍 Python</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="scriptType"
                  className="radio radio-primary"
                  checked={scriptType === 'javascript'}
                  onChange={() => setScriptType('javascript')}
                />
                <span className="label-text">⚡ JavaScript</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 脚本内容 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-lg">脚本内容</h3>

          <div className="form-control">
            <textarea
              className={`textarea textarea-bordered h-64 font-mono text-sm ${
                errors.scriptContent ? 'textarea-error' : ''
              }`}
              placeholder={getPlaceholder()}
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
            />
            {errors.scriptContent && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.scriptContent}</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn btn-primary">
          {button ? '保存' : '创建'}
        </button>
      </div>
    </form>
  );
}
