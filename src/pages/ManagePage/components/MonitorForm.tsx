import { useState, useEffect } from 'react';
import type { Monitor } from '../../../types';

interface MonitorFormProps {
  monitor?: Monitor | null;
  onSave: (monitor: Omit<Monitor, 'id' | 'created_at'>) => void;
  onCancel: () => void;
}

export default function MonitorForm({ monitor, onSave, onCancel }: MonitorFormProps) {
  const [name, setName] = useState('');
  const [monitorType, setMonitorType] = useState<'process' | 'api' | 'port'>('process');
  const [checkInterval, setCheckInterval] = useState(60);
  const [alertOnFailure, setAlertOnFailure] = useState(true);

  // Process monitoring fields
  const [targetType, setTargetType] = useState<'name' | 'pid'>('name');
  const [processName, setProcessName] = useState('');
  const [processPid, setProcessPid] = useState('');

  // API monitoring fields
  const [apiUrl, setApiUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState('GET');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [requestBody, setRequestBody] = useState('');
  const [expectedContent, setExpectedContent] = useState('');

  // Port monitoring fields
  const [portTarget, setPortTarget] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (monitor) {
      setName(monitor.name);
      setMonitorType(monitor.monitor_type);
      setCheckInterval(monitor.check_interval);
      setAlertOnFailure(monitor.alert_on_failure);
      setExpectedContent(monitor.expected_result || '');

      if (monitor.monitor_type === 'process') {
        // Parse process target
        const target = monitor.target;
        if (/^\d+$/.test(target)) {
          setTargetType('pid');
          setProcessPid(target);
        } else {
          setTargetType('name');
          setProcessName(target);
        }
      } else if (monitor.monitor_type === 'api') {
        // Parse API target (could be JSON or simple URL)
        try {
          const config = JSON.parse(monitor.target);
          setApiUrl(config.url || '');
          setHttpMethod(config.method || 'GET');
          setRequestBody(config.body || '');
          if (config.headers && Array.isArray(config.headers)) {
            setHeaders(config.headers);
          }
        } catch {
          // Simple URL string
          setApiUrl(monitor.target);
          setHttpMethod('GET');
        }
      } else if (monitor.monitor_type === 'port') {
        // Parse port target
        setPortTarget(monitor.target);
      }
    }
  }, [monitor]);

  const validate = () => {
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
        // Validate format: "host:port" or just "port"
        const parts = portTarget.trim().split(':');
        if (parts.length === 1) {
          // Just port number
          const port = parseInt(parts[0]);
          if (isNaN(port) || port < 1 || port > 65535) {
            newErrors.portTarget = '端口号必须在 1-65535 之间';
          }
        } else if (parts.length === 2) {
          // host:port format
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    let target = '';
    let icon = '📊';

    if (monitorType === 'process') {
      target = targetType === 'pid' ? processPid.trim() : processName.trim();
      icon = '📊';
    } else if (monitorType === 'api') {
      // Build API config JSON
      const config: any = {
        url: apiUrl.trim(),
        method: httpMethod,
      };

      if (headers.length > 0) {
        config.headers = headers.filter(h => h.key.trim() && h.value.trim());
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

    onSave({
      name: name.trim(),
      icon,
      monitor_type: monitorType,
      target,
      check_interval: checkInterval,
      expected_result: expectedContent.trim() || null,
      alert_on_failure: alertOnFailure,
      is_active: false,
      last_check_time: null,
      last_status: null,
    });
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 基本信息 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-lg">基本信息</h3>

          {/* 监控名称 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">监控名称 *</span>
            </label>
            <input
              type="text"
              placeholder="输入监控名称"
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

          {/* 监控类型 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">监控类型 *</span>
            </label>
            <div className="flex gap-2">
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="monitorType"
                  className="radio radio-primary"
                  checked={monitorType === 'process'}
                  onChange={() => setMonitorType('process')}
                />
                <span className="label-text">📊 进程监控</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="monitorType"
                  className="radio radio-primary"
                  checked={monitorType === 'api'}
                  onChange={() => setMonitorType('api')}
                />
                <span className="label-text">🌐 API监控</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="monitorType"
                  className="radio radio-primary"
                  checked={monitorType === 'port'}
                  onChange={() => setMonitorType('port')}
                />
                <span className="label-text">🔌 端口监控</span>
              </label>
            </div>
          </div>

          {/* 检查间隔 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">检查间隔（秒）*</span>
            </label>
            <input
              type="number"
              min="1"
              placeholder="60"
              className={`input input-bordered ${errors.checkInterval ? 'input-error' : ''}`}
              value={checkInterval}
              onChange={(e) => setCheckInterval(parseInt(e.target.value) || 60)}
            />
            {errors.checkInterval && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.checkInterval}</span>
              </label>
            )}
          </div>

          {/* 失败时告警 */}
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">失败时发送告警</span>
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={alertOnFailure}
                onChange={(e) => setAlertOnFailure(e.target.checked)}
              />
            </label>
          </div>
        </div>
      </div>

      {/* 进程监控配置 */}
      {monitorType === 'process' && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-lg">进程监控配置</h3>

            {/* 目标类型 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">目标类型 *</span>
              </label>
              <div className="flex gap-2">
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="targetType"
                    className="radio radio-primary"
                    checked={targetType === 'name'}
                    onChange={() => setTargetType('name')}
                  />
                  <span className="label-text">进程名称</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="targetType"
                    className="radio radio-primary"
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
                  <span className="label-text">进程名称 *</span>
                </label>
                <input
                  type="text"
                  placeholder="例如: node, java, python"
                  className={`input input-bordered ${errors.processName ? 'input-error' : ''}`}
                  value={processName}
                  onChange={(e) => setProcessName(e.target.value)}
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
                  <span className="label-text">进程ID (PID) *</span>
                </label>
                <input
                  type="text"
                  placeholder="例如: 1234"
                  className={`input input-bordered ${errors.processPid ? 'input-error' : ''}`}
                  value={processPid}
                  onChange={(e) => setProcessPid(e.target.value)}
                />
                {errors.processPid && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.processPid}</span>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* API监控配置 */}
      {monitorType === 'api' && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-lg">API监控配置</h3>

            {/* API URL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">API URL *</span>
              </label>
              <input
                type="text"
                placeholder="https://api.example.com/health"
                className={`input input-bordered ${errors.apiUrl ? 'input-error' : ''}`}
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
              {errors.apiUrl && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.apiUrl}</span>
                </label>
              )}
            </div>

            {/* HTTP方法 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">HTTP方法 *</span>
              </label>
              <select
                className="select select-bordered"
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            {/* 请求头 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">请求头（可选）</span>
              </label>
              <div className="space-y-2">
                {headers.map((header, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Key"
                      className="input input-bordered input-sm flex-1"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      className="input input-bordered input-sm flex-1"
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
              <div className="form-control">
                <label className="label">
                  <span className="label-text">请求体（可选）</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-32 font-mono text-sm"
                  placeholder='{"key": "value"}'
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                />
              </div>
            )}

            {/* 期望响应内容 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">期望响应内容（可选）</span>
              </label>
              <input
                type="text"
                placeholder="响应中应包含的文本"
                className="input input-bordered"
                value={expectedContent}
                onChange={(e) => setExpectedContent(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt">如果指定，响应内容必须包含此文本才算成功</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 端口监控配置 */}
      {monitorType === 'port' && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-lg">端口监控配置</h3>

            {/* 端口目标 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">端口目标 *</span>
              </label>
              <input
                type="text"
                placeholder="例如: 3000 或 localhost:8080"
                className={`input input-bordered ${errors.portTarget ? 'input-error' : ''}`}
                value={portTarget}
                onChange={(e) => setPortTarget(e.target.value)}
              />
              {errors.portTarget && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.portTarget}</span>
                </label>
              )}
              <label className="label">
                <span className="label-text-alt">
                  格式: "端口号" (默认检查本地) 或 "主机:端口" (检查远程)
                  <br />
                  示例: 3000, 8080, localhost:3000, 192.168.1.1:80
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn btn-primary">
          {monitor ? '保存' : '创建'}
        </button>
      </div>
    </form>
  );
}
