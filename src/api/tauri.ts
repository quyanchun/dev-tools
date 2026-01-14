import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { Button, LogEntry, Monitor, Folder } from '../types';

// ============================================================================
// Test API
// ============================================================================

export async function testDbConnection(): Promise<string> {
  return await invoke('test_db_connection');
}

// ============================================================================
// Button APIs
// ============================================================================

export async function createButton(button: Button): Promise<string> {
  return await invoke('create_button', { button });
}

export async function getAllButtons(): Promise<Button[]> {
  return await invoke('get_all_buttons');
}

export async function getButton(id: string): Promise<Button> {
  return await invoke('get_button', { id });
}

export async function updateButton(id: string, button: Button): Promise<void> {
  return await invoke('update_button', { id, button });
}

export async function deleteButton(id: string): Promise<void> {
  return await invoke('delete_button', { id });
}

export async function getButtonsByFolder(folder_id: string | null): Promise<Button[]> {
  return await invoke('get_buttons_by_folder', { folderId: folder_id });
}

export interface PositionUpdate {
  id: string;
  position: number;
}

export async function updateButtonPositions(updates: PositionUpdate[]): Promise<void> {
  return await invoke('update_button_positions', { updates });
}

export async function updateMonitorPositions(updates: PositionUpdate[]): Promise<void> {
  return await invoke('update_monitor_positions', { updates });
}

export async function updateFolderPositions(updates: PositionUpdate[]): Promise<void> {
  return await invoke('update_folder_positions', { updates });
}

// ============================================================================
// Folder APIs
// ============================================================================

export async function createFolder(folder: Folder): Promise<string> {
  return await invoke('create_folder', { folder });
}

export async function getAllFolders(): Promise<Folder[]> {
  return await invoke('get_all_folders');
}

export async function getFolder(id: string): Promise<Folder> {
  return await invoke('get_folder', { id });
}

export async function updateFolder(id: string, folder: Folder): Promise<void> {
  return await invoke('update_folder', { id, folder });
}

export async function deleteFolder(id: string): Promise<void> {
  return await invoke('delete_folder', { id });
}

// ============================================================================
// Execution APIs
// ============================================================================

export async function executeScript(button_id: string): Promise<string> {
  return await invoke('execute_script', { buttonId: button_id });
}

// ============================================================================
// Log APIs
// ============================================================================

export async function getLogs(): Promise<LogEntry[]> {
  return await invoke('get_logs');
}

export async function getLogsByButton(button_id: string): Promise<LogEntry[]> {
  return await invoke('get_logs_by_button', { buttonId: button_id });
}

export async function clearLogs(): Promise<void> {
  return await invoke('clear_logs');
}

// ============================================================================
// Event Listeners
// ============================================================================

export async function listenToLogs(callback: (log: LogEntry) => void): Promise<UnlistenFn> {
  return await listen<LogEntry>('log-entry', (event) => {
    callback(event.payload);
  });
}

// ============================================================================
// Monitor APIs
// ============================================================================

export async function createMonitor(monitor: Monitor): Promise<Monitor> {
  return await invoke('create_monitor', { monitor });
}

export async function getAllMonitors(): Promise<Monitor[]> {
  return await invoke('get_all_monitors');
}

export async function getMonitor(id: string): Promise<Monitor> {
  return await invoke('get_monitor', { id });
}

export async function updateMonitor(id: string, monitor: Monitor): Promise<void> {
  return await invoke('update_monitor', { id, monitor });
}

export async function deleteMonitor(id: string): Promise<void> {
  return await invoke('delete_monitor', { id });
}

export async function startMonitor(id: string): Promise<void> {
  return await invoke('start_monitor', { id });
}

export async function stopMonitor(id: string): Promise<void> {
  return await invoke('stop_monitor', { id });
}

export async function getMonitorLogs(monitorId: string): Promise<LogEntry[]> {
  return await invoke('get_monitor_logs', { monitorId });
}

// Monitor event listeners
export async function listenToMonitorStatus(
  callback: (status: { monitor_id: string; status: string; last_check_time: number; message?: string }) => void
): Promise<UnlistenFn> {
  return await listen('monitor-status-update', (event) => {
    callback(event.payload as any);
  });
}

export async function listenToMonitorAlert(
  callback: (alert: { monitor_id: string; status: string; last_check_time: number; message?: string }) => void
): Promise<UnlistenFn> {
  return await listen('monitor-alert', (event) => {
    callback(event.payload as any);
  });
}
