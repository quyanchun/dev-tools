// 按钮类型
export interface Button {
  id: string;
  name: string;
  icon?: string | null;
  script_type: 'shell' | 'javascript' | 'python';
  script_content: string;
  folder_id?: string | null;
  position: number;
  created_at: number;
  updated_at: number;
}

// 文件夹类型
export interface Folder {
  id: string;
  name: string;
  icon?: string | null;
  position: number;
  created_at: number;
}

// 监控类型
export interface Monitor {
  id: string;
  name: string;
  icon?: string | null;
  monitor_type: 'process' | 'api';
  target: string;
  check_interval: number;
  expected_result?: string | null;
  alert_on_failure: boolean;
  is_active: boolean;
  last_check_time?: number | null;
  last_status?: string | null;
  created_at: number;
}

// 日志类型
export interface LogEntry {
  id: string;
  button_id?: string | null;
  monitor_id?: string | null;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

// 执行状态
export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';

// 监控状态
export type MonitorStatus = 'stopped' | 'running' | 'checking' | 'alert';
