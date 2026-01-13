import { useState } from 'react';
import { testDbConnection } from '../../api/tauri';
import { useLauncherStore } from '../../store/launcherStore';
import { useLogStore } from '../../store/logStore';

export default function HomePage() {
  const [dbStatus, setDbStatus] = useState<string>('');
  const { buttons, addButton } = useLauncherStore();
  const { logs, addLog, isPanelOpen, togglePanel } = useLogStore();

  const handleTestDb = async () => {
    try {
      const result = await testDbConnection();
      setDbStatus(result);
      addLog({
        id: Date.now().toString(),
        level: 'info',
        message: '数据库连接测试成功',
        timestamp: Date.now(),
      });
    } catch (error) {
      setDbStatus(`错误: ${error}`);
      addLog({
        id: Date.now().toString(),
        level: 'error',
        message: `数据库连接失败: ${error}`,
        timestamp: Date.now(),
      });
    }
  };

  const handleAddTestButton = () => {
    addButton({
      id: Date.now().toString(),
      name: '测试按钮',
      scriptType: 'shell',
      scriptContent: 'echo "Hello"',
      position: buttons.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="h-full p-6">
      <h1 className="text-2xl font-bold mb-4">首页 - 启动台</h1>

      <div className="flex gap-2 mb-4">
        <button className="btn btn-primary" onClick={handleTestDb}>
          测试数据库连接
        </button>
        <button className="btn btn-secondary" onClick={handleAddTestButton}>
          添加测试按钮
        </button>
        <button className="btn btn-accent" onClick={togglePanel}>
          切换日志面板 ({logs.length})
        </button>
      </div>

      {dbStatus && <div className="mb-4 p-4 bg-base-300 rounded">{dbStatus}</div>}

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">按钮列表 ({buttons.length})</h2>
        <div className="space-y-2">
          {buttons.map((btn) => (
            <div key={btn.id} className="p-2 bg-base-300 rounded">
              {btn.name} - {btn.scriptType}
            </div>
          ))}
        </div>
      </div>

      {isPanelOpen && (
        <div className="p-4 bg-base-300 rounded">
          <h2 className="text-lg font-semibold mb-2">日志</h2>
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="text-sm">
                [{log.level}] {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
