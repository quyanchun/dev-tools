// 按钮类型
export interface Button {
  id: string;
  name: string;
  icon?: string;
  scriptType: 'shell' | 'js' | 'python';
  scriptContent: string;
  folderId?: string;
  position: number;
  createdAt: number;
  updatedAt: number;
}

// 文件夹类型
export interface Folder {
  id: string;
  name: string;
  icon?: string;
  position: number;
  createdAt: number;
}

// 监控类型
export interface Monitor {
  id: string;
  name: string;
  icon?: string;
  monitorType: 'process' | 'api';
  target: string;
  checkInterval: number;
  expectedResult?: string;
  alertOnFailure: boolean;
  isActive: boolean;
  lastCheckTime?: number;
  lastStatus?: 'running' | 'stopped' | 'error';
  createdAt: number;
}

// 日志类型
export interface LogEntry {
  id: string;
  buttonId?: string;
  monitorId?: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

// 执行状态
export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';

// 监控状态
export type MonitorStatus = 'stopped' | 'running' | 'checking' | 'alert';
