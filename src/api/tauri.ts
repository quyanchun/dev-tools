import { invoke } from '@tauri-apps/api/core';

export async function testDbConnection(): Promise<string> {
  return await invoke('test_db_connection');
}
