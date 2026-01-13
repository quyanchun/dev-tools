import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { Button, LogEntry } from '../types';

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
