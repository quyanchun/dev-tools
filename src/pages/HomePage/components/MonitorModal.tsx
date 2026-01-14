import { useState, useEffect, useCallback } from 'react';
import { createMonitor, updateMonitor } from '../../../api/tauri';
import type { Monitor } from '../../../types';

interface MonitorModalProps {
  isOpen: boolean;
  monitor?: Monitor | null;  // null表示创建模式，有值表示编辑模式
  onClose: () => void;
  onSuccess: () => void;
}

type MonitorType = 'process' | 'api' | 'port';
type TargetType = 'name' | 'pid';

export default function MonitorModal({ isOpen, monitor, onClose, onSuccess }: MonitorModalProps) {
  // 基本字段
  const [name, setName] = useState('');
  const [monitorType, setMonitorType] = useState<MonitorType>('process');
  const [checkInterval, setCheckInterval] = useState(60);
  const [alertOnFailure, setAlertOnFailure] = useState(true);

  // 进程监控字段
  const [targetType, setTargetType] = useState<TargetType>('name');
  const [processName, setProcessName] = useState('');
  const [processPid, setProcessPid] = useState('');

  // API监控字段
  const [apiUrl, setApiUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState('GET');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [requestBody, setRequestBody] = useState('');
  const [expectedContent, setExpectedContent] = useState('');

  // 端口监控字段
  const [portTarget, setPortTarget] = useState('');

  // 状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!monitor;

  // 重置表单
  const resetForm = useCallback(() => {
    setName('');
    setMonitorType('process');
    setCheckInterval(60);
    setAlertOnFailure(true);
    setTargetType('name');
    setProcessName('');
    setProcessPid('');
    setApiUrl('');
    setHttpMethod('GET');
    setHeaders([]);
    setRequestBody('');
    setExpectedContent('');
    setPortTarget('');
    setErrors({});
  }, []);

  // 编辑模式下预填充表单
  useEffect(() => {
    if (isOpen && monitor) {
      setName(monitor.name);
      setMonitorType(monitor.monitor_type);
      setCheckInterval(monitor.check_interval);
      setAlertOnFailure(monitor.alert_on_failure);
      setExpectedContent(monitor.expected_result || '');

      if (monitor.monitor_type === 'process') {
        const target = monitor.target;
        if (/^\d+$/.test(target)) {
          setTargetType('pid');
          setProcessPid(target);
          setProcessName('');
        } else {
          setTargetType('name');
          setProcessName(target);
          setProcessPid('');
        }
      } else if (monitor.monitor_type === 'api') {
        try {
          const config = JSON.parse(monitor.target);
          setApiUrl(config.url || '');
          setHttpMethod(config.method || 'GET');
          setRequestBody(config.body || '');
          if (config.headers && Array.isArray(config.headers)) {
            setHeaders(config.headers);
          } else {
            setHeaders([]);
          }
        } catch {
          setApiUrl(monitor.target);
          setHttpMethod('GET');
          setHeaders([]);
          setRequestBody('');
        }
      } else if (monitor.monitor_type === 'port') {
        setPortTarget(monitor.target);
      }

      setErrors({});
    } else if (isOpen && !monitor) {
      resetForm();
    }
  }, [isOpen, monitor, resetForm]);

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = '监控名称不能为空';
    }

    if (checkInterval < 1) {
      newErrors.checkInterval = '检查间隔必须大于0秒';
    }

    if (monitorType === 'process') {
      if (targetType === 'name' && !processName.trim()) {
        newErrors.processName = '进程名称不能为空';
      }
      if (targetType === 'pid') {
        if (!processPid.trim()) {
          newErrors.processPid = '进程ID不能为空';
        } else if (!/^\d+$/.test(processPid.trim())) {
          newErrors.processPid = '进程ID必须是正整数';
        }
      }
    } else if (monitorType === 'api') {
      if (!apiUrl.trim()) {
        newErrors.apiUrl = 'API URL不能为空';
      } else {
        try {
          new URL(apiUrl);
        } catch {
          newErrors.apiUrl = 'API URL格式不正确';
        }
      }
    } else if (monitorType === 'port') {
      if (!portTarget.trim()) {
        newErrors.portTarget = '端口目标不能为空';
      } else {
        const parts = portTarget.trim().split(':');
        if (parts.length === 1) {
          const port = parseInt(parts[0]);
          if (isNaN(port) || port < 1 || port > 65535) {
            newErrors.portTarget = '端口号必须在 1-65535 之间';
          }
        } else if (parts.length === 2) {
          const port = parseInt(parts[1]);
          if (isNaN(port) || port < 1 || port > 65535) {
            newErrors.portTarget = '端口号必须在 1-65535 之间';
          }
          if (!parts[0].trim()) {
            newErrors.portTarget = '主机名不能为空';
          }
        } else {
          newErrors.portTarget = '格式错误，应为 "端口" 或 "主机:端口"';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let target = '';
      let icon = '📊';

      if (monitorType === 'process') {
        target = targetType === 'pid' ? processPid.trim() : processName.trim();
        icon = '📊';
      } else if (monitorType === 'api') {
        const config: Record<string, unknown> = {
          url: apiUrl.trim(),
          method: httpMethod,
        };

        const filteredHeaders = headers.filter(h => h.key.trim() && h.value.trim());
        if (filteredHeaders.length > 0) {
          config.headers = filteredHeaders;
        }

        if (requestBody.trim() && ['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
          config.body = requestBody.trim();
        }

        target = JSON.stringify(config);
        icon = '🌐';
      } else if (monitorType === 'port') {
        target = portTarget.trim();
        icon = '🔌';
      }

      const monitorData: Monitor = {
        id: monitor?.id ?? crypto.randomUUID(),
        name: name.trim(),
        icon,
        monitor_type: monitorType,
        target,
        check_interval: checkInterval,
        expected_result: expectedContent.trim() || null,
        alert_on_failure: alertOnFailure,
        is_active: monitor?.is_active ?? false,
        last_check_time: monitor?.last_check_time ?? null,
        last_status: monitor?.last_status ?? null,
        folder_id: monitor?.folder_id ?? null,
        position: monitor?.position ?? Math.floor(Date.now() / 1000),
        created_at: monitor?.created_at ?? Math.floor(Date.now() / 1000),
      };

      if (isEditMode && monitor) {
        await updateMonitor(monitor.id, monitorData);
      } else {
        await createMonitor(monitorData);
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({ submit: `${isEditMode ? '更新' : '创建'}失败: ${err}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
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
        className="glass-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-xl mb-6">
          {isEditMode ? '编辑监控' : '创建新监控'}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* 基本信息 */}
          <div className="mb-6">
            <h4 className="font-medium text-sm text-base-content/70 mb-3">基本信息</h4>
            
            {/* 监控名称 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">监控名称 *</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入监控名称..."
                className={`input input-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary ${errors.name ? 'input-error' : ''}`}
                autoFocus
              />
              {errors.name && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.name}</span>
                </label>
              )}
            </div>

            {/* 监控类型 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">监控类型 *</span>
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="monitorType"
                    className="radio radio-primary radio-sm"
                    checked={monitorType === 'process'}
                    onChange={() => setMonitorType('process')}
                  />
                  <span className="label-text">📊 进程监控</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="monitorType"
                    className="radio radio-primary radio-sm"
                    checked={monitorType === 'api'}
                    onChange={() => setMonitorType('api')}
                  />
                  <span className="label-text">🌐 API监控</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="monitorType"
                    className="radio radio-primary radio-sm"
                    checked={monitorType === 'port'}
                    onChange={() => setMonitorType('port')}
                  />
                  <span className="label-text">🔌 端口监控</span>
                </label>
              </div>
            </div>

            {/* 检查间隔 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">检查间隔（秒）*</span>
              </label>
              <input
                type="number"
                min="1"
                value={checkInterval}
                onChange={(e) => setCheckInterval(parseInt(e.target.value) || 60)}
                placeholder="60"
                className={`input input-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary ${errors.checkInterval ? 'input-error' : ''}`}
              />
              {errors.checkInterval && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.checkInterval}</span>
                </label>
              )}
            </div>

            {/* 失败告警 */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={alertOnFailure}
                  onChange={(e) => setAlertOnFailure(e.target.checked)}
                />
                <span className="label-text font-medium">失败时发送告警</span>
              </label>
            </div>
          </div>

          {/* 进程监控配置 */}
          {monitorType === 'process' && (
            <div className="mb-6 p-4 rounded-xl bg-base-200/50">
              <h4 className="font-medium text-sm text-base-content/70 mb-3">进程监控配置</h4>

              {/* 目标类型 */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-medium">目标类型 *</span>
                </label>
                <div className="flex gap-4">
                  <label className="label cursor-pointer gap-2">
                    <input
                      type="radio"
                      name="targetType"
                      className="radio radio-primary radio-sm"
                      checked={targetType === 'name'}
                      onChange={() => setTargetType('name')}
                    />
                    <span className="label-text">进程名称</span>
                  </label>
                  <label className="label cursor-pointer gap-2">
                    <input
                      type="radio"
                      name="targetType"
                      className="radio radio-primary radio-sm"
                      checked={targetType === 'pid'}
                      onChange={() => setTargetType('pid')}
                    />
                    <span className="label-text">进程ID (PID)</span>
                  </label>
                </div>
              </div>

              {/* 进程名称 */}
              {targetType === 'name' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">进程名称 *</span>
                  </label>
                  <input
                    type="text"
                    value={processName}
                    onChange={(e) => setProcessName(e.target.value)}
                    placeholder="例如: node, java, python"
                    className={`input input-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary ${errors.processName ? 'input-error' : ''}`}
                  />
                  {errors.processName && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.processName}</span>
                    </label>
                  )}
                </div>
              )}

              {/* 进程ID */}
              {targetType === 'pid' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">进程ID (PID) *</span>
                  </label>
                  <input
                    type="text"
                    value={processPid}
                    onChange={(e) => setProcessPid(e.target.value)}
                    placeholder="例如: 1234"
                    className={`input input-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary ${errors.processPid ? 'input-error' : ''}`}
                  />
                  {errors.processPid && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.processPid}</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {/* API监控配置 */}
          {monitorType === 'api' && (
            <div className="mb-6 p-4 rounded-xl bg-base-200/50">
              <h4 className="font-medium text-sm text-base-content/70 mb-3">API监控配置</h4>

              {/* API URL */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-medium">API URL *</span>
                </label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com/health"
                  className={`input input-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary ${errors.apiUrl ? 'input-error' : ''}`}
                />
                {errors.apiUrl && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.apiUrl}</span>
                  </label>
                )}
              </div>

              {/* HTTP方法 */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-medium">HTTP方法 *</span>
                </label>
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value)}
                  className="select select-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              {/* 请求头 */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-medium">请求头（可选）</span>
                </label>
                <div className="space-y-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Key"
                        className="input input-bordered input-sm flex-1 bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10"
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        className="input input-bordered input-sm flex-1 bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10"
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => removeHeader(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-sm btn-ghost" onClick={addHeader}>
                    + 添加请求头
                  </button>
                </div>
              </div>

              {/* 请求体 */}
              {['POST', 'PUT', 'PATCH'].includes(httpMethod) && (
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">请求体（可选）</span>
                  </label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="textarea textarea-bordered w-full h-24 bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary font-mono text-sm"
                  />
                </div>
              )}

              {/* 期望响应 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">期望响应内容（可选）</span>
                </label>
                <input
                  type="text"
                  value={expectedContent}
                  onChange={(e) => setExpectedContent(e.target.value)}
                  placeholder="响应中应包含的文本"
                  className="input input-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50">如果指定，响应内容必须包含此文本才算成功</span>
                </label>
              </div>
            </div>
          )}

          {/* 端口监控配置 */}
          {monitorType === 'port' && (
            <div className="mb-6 p-4 rounded-xl bg-base-200/50">
              <h4 className="font-medium text-sm text-base-content/70 mb-3">端口监控配置</h4>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">端口目标 *</span>
                </label>
                <input
                  type="text"
                  value={portTarget}
                  onChange={(e) => setPortTarget(e.target.value)}
                  placeholder="例如: 3000 或 localhost:8080"
                  className={`input input-bordered w-full bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-white/10 focus:border-primary ${errors.portTarget ? 'input-error' : ''}`}
                />
                {errors.portTarget && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.portTarget}</span>
                  </label>
                )}
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    格式: "端口号" (默认检查本地) 或 "主机:端口" (检查远程)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {errors.submit && (
            <div className="bg-error/10 border border-error/30 rounded-xl p-3 mb-5 flex items-center gap-2 text-error">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{errors.submit}</span>
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
