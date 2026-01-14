import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useLauncherStore } from '../../../store/launcherStore';
import { useDragDrop } from './DragDropWrapper';
import { ContextMenu, MenuItem } from '../../../components/ContextMenu';
import DraggableButton from './DraggableButton';
import DraggableMonitorCard from './DraggableMonitorCard';
import FolderCard from './FolderCard';
import type { Button, Folder, Monitor } from '../../../types';

interface ContextMenuState {
  x: number;
  y: number;
  type: 'blank' | 'button' | 'folder';
  target?: Button | Folder;
}

interface ButtonAreaProps {
  onExecute: (id: string) => void;
  buttonStatuses: Record<string, 'idle' | 'running' | 'success' | 'error'>;
  searchQuery: string;
  monitors: Monitor[];
  onShowMonitorDetails: (monitor: Monitor) => void;
  onCreateFolder: () => void;
  onEditButton: (button: Button) => void;
  onDeleteButton: (button: Button) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
}

export default function ButtonArea({
  onExecute,
  buttonStatuses,
  searchQuery,
  monitors,
  onShowMonitorDetails,
  onCreateFolder,
  onEditButton,
  onDeleteButton,
  onEditFolder,
  onDeleteFolder,
}: ButtonAreaProps) {
  const { buttons, folders } = useLauncherStore();
  const { activeButton, isRootOver } = useDragDrop();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const { setNodeRef: setRootRef } = useDroppable({ id: 'root-droppable' });

  // 统一搜索过滤
  const query = searchQuery.toLowerCase();
  const filteredButtons = query 
    ? buttons.filter(btn => btn.name.toLowerCase().includes(query))
    : buttons;
  const filteredMonitors = query
    ? monitors.filter(m => m.is_active && m.name.toLowerCase().includes(query))
    : monitors.filter(m => m.is_active);
  const filteredFolders = query
    ? folders.filter(f => f.name.toLowerCase().includes(query))
    : folders;

  const rootButtons = filteredButtons.filter(b => !b.folder_id);
  const rootMonitors = filteredMonitors.filter(m => !m.folder_id).sort((a, b) => a.position - b.position);
  
  const folderMap = filteredFolders.reduce((acc, folder) => {
    acc[folder.id] = {
      folder,
      buttons: filteredButtons.filter(b => b.folder_id === folder.id),
      monitors: filteredMonitors.filter(m => m.folder_id === folder.id).sort((a, b) => a.position - b.position),
    };
    return acc;
  }, {} as Record<string, { folder: Folder; buttons: Button[]; monitors: Monitor[] }>);

  const allRootItemIds = [
    ...filteredFolders.map(f => `folder-${f.id}`),
    ...rootMonitors.map(m => `monitor-${m.id}`),
    ...rootButtons.map(b => b.id)
  ];

  // 右键菜单处理
  const handleBlankContextMenu = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('[data-context-item]')) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'blank' });
    }
  };

  const handleButtonContextMenu = (e: React.MouseEvent, button: Button) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'button', target: button });
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', target: folder });
  };

  const getMenuItems = (): MenuItem[] => {
    if (!contextMenu) return [];

    if (contextMenu.type === 'blank') {
      return [{
        label: '新建文件夹',
        icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>,
        onClick: onCreateFolder,
      }];
    }

    if (contextMenu.type === 'button') {
      const button = contextMenu.target as Button;
      return [
        { label: '编辑', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>, onClick: () => onEditButton(button) },
        { label: '删除', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>, onClick: () => onDeleteButton(button), danger: true },
      ];
    }

    if (contextMenu.type === 'folder') {
      const folder = contextMenu.target as Folder;
      return [
        { label: '编辑', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>, onClick: () => onEditFolder(folder) },
        { label: '删除', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>, onClick: () => onDeleteFolder(folder), danger: true },
      ];
    }

    return [];
  };

  const hasContent = filteredFolders.length > 0 || rootButtons.length > 0 || rootMonitors.length > 0;

  return (
    <div ref={setRootRef} onContextMenu={handleBlankContextMenu} className="min-h-[200px]">
      {/* 拖拽提示 */}
      {isRootOver && activeButton?.folder_id && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="glass-card p-6 animate-bounce-in">
            <p className="text-lg font-semibold text-primary">松开以移出文件夹</p>
          </div>
        </div>
      )}

      {/* 统一网格 */}
      {hasContent && (
        <SortableContext items={allRootItemIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
            {/* 监控卡片 */}
            {rootMonitors.map(monitor => (
              <DraggableMonitorCard key={monitor.id} monitor={monitor} onShowDetails={onShowMonitorDetails} />
            ))}
            
            {/* 文件夹 */}
            {filteredFolders.map(folder => (
              <FolderCard
                key={folder.id}
                folder={folder}
                buttons={folderMap[folder.id]?.buttons || []}
                monitors={folderMap[folder.id]?.monitors || []}
                onExecute={onExecute}
                buttonStatuses={buttonStatuses}
                onContextMenu={e => handleFolderContextMenu(e, folder)}
                onButtonContextMenu={handleButtonContextMenu}
                onShowMonitorDetails={onShowMonitorDetails}
              />
            ))}

            {/* 按钮 */}
            {rootButtons.map(button => (
              <DraggableButton
                key={button.id}
                button={button}
                onExecute={onExecute}
                status={buttonStatuses[button.id] || 'idle'}
                onContextMenu={e => handleButtonContextMenu(e, button)}
              />
            ))}
          </div>
        </SortableContext>
      )}

      {/* 搜索无结果 */}
      {searchQuery && !hasContent && (
        <div className="text-center py-16 text-base-content/50">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg mb-2">未找到匹配项</p>
          <p className="text-sm">尝试其他关键词</p>
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={getMenuItems()} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
