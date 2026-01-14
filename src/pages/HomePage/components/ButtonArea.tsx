import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useUnifiedStore } from '../../../store/unifiedStore';
import { useDragDrop } from './DragDropWrapper';
import { ContextMenu, MenuItem } from '../../../components/ContextMenu';
import UnifiedCard from './UnifiedCard';
import type { Button, Folder, Monitor } from '../../../types';

interface ContextMenuState {
  x: number;
  y: number;
  type: 'blank' | 'button' | 'folder' | 'monitor';
  target?: Button | Folder | Monitor;
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
  onEditMonitor: (monitor: Monitor) => void;
  onDeleteMonitor: (monitor: Monitor) => void;
  onToggleMonitor?: (monitor: Monitor) => void;
}

export default function ButtonArea({
  onExecute,
  buttonStatuses,
  searchQuery,
  onShowMonitorDetails,
  onCreateFolder,
  onEditButton,
  onDeleteButton,
  onEditFolder,
  onDeleteFolder,
  onEditMonitor,
  onDeleteMonitor,
  onToggleMonitor,
}: ButtonAreaProps) {
  const { getItemsByContainer } = useUnifiedStore();
  const { activeItem, isRootOver } = useDragDrop();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const { setNodeRef: setRootRef } = useDroppable({ id: 'root-droppable' });

  // 获取根级别的所有项目（已按位置排序）
  const rootItems = getItemsByContainer(null);

  // 应用搜索过滤
  const query = searchQuery.toLowerCase();
  const filteredItems = query
    ? rootItems.filter((item) => {
        const name =
          item.type === 'monitor'
            ? (item.data as Monitor).name
            : item.type === 'folder'
            ? (item.data as Folder).name
            : (item.data as Button).name;
        return name.toLowerCase().includes(query);
      })
    : rootItems;

  // 为 SortableContext 生成 ID 列表
  const allRootItemIds = filteredItems.map((item) => `${item.type}-${item.id}`);

  // 为文件夹准备内容
  const getFolderContent = (folderId: string) => {
    const folderItems = getItemsByContainer(folderId);
    const buttons = folderItems
      .filter((item) => item.type === 'button')
      .map((item) => item.data as Button);
    const monitors = folderItems
      .filter((item) => item.type === 'monitor')
      .map((item) => item.data as Monitor);
    return { buttons, monitors };
  };

  // 右键菜单处理
  const handleBlankContextMenu = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('[data-context-item]')) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'blank' });
    }
  };

  const handleItemContextMenu = (
    e: React.MouseEvent,
    type: 'button' | 'folder' | 'monitor',
    target: Button | Folder | Monitor
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, target });
  };

  const getMenuItems = (): MenuItem[] => {
    if (!contextMenu) return [];

    if (contextMenu.type === 'blank') {
      return [
        {
          label: '新建文件夹',
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
          ),
          onClick: onCreateFolder,
        },
      ];
    }

    if (contextMenu.type === 'button') {
      const button = contextMenu.target as Button;
      return [
        {
          label: '编辑',
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          ),
          onClick: () => onEditButton(button),
        },
        {
          label: '删除',
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          ),
          onClick: () => onDeleteButton(button),
          danger: true,
        },
      ];
    }

    if (contextMenu.type === 'folder') {
      const folder = contextMenu.target as Folder;
      return [
        {
          label: '编辑',
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          ),
          onClick: () => onEditFolder(folder),
        },
        {
          label: '删除',
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          ),
          onClick: () => onDeleteFolder(folder),
          danger: true,
        },
      ];
    }

    if (contextMenu.type === 'monitor') {
      const monitor = contextMenu.target as Monitor;
      return [
        {
          label: monitor.is_active ? '停止' : '启动',
          icon: monitor.is_active ? (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
              />
            </svg>
          ) : (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          onClick: () => onToggleMonitor?.(monitor),
        },
        {
          label: '编辑',
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          ),
          onClick: () => onEditMonitor(monitor),
        },
        {
          label: '删除',
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          ),
          onClick: () => onDeleteMonitor(monitor),
          danger: true,
        },
      ];
    }

    return [];
  };

  const hasContent = filteredItems.length > 0;

  return (
    <div ref={setRootRef} onContextMenu={handleBlankContextMenu} className="min-h-[200px]">
      {/* 拖拽提示 */}
      {isRootOver && activeItem?.folder_id && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="glass-card p-6 animate-bounce-in">
            <p className="text-lg font-semibold text-primary">松开以移出文件夹</p>
          </div>
        </div>
      )}

      {/* 统一网格 - 使用 UnifiedCard 渲染所有项目 */}
      {hasContent && (
        <SortableContext items={allRootItemIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
            {filteredItems.map((item) => {
              const folderContent =
                item.type === 'folder' ? getFolderContent(item.id) : undefined;

              return (
                <UnifiedCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onExecute={onExecute}
                  buttonStatus={buttonStatuses[item.id] || 'idle'}
                  onShowMonitorDetails={onShowMonitorDetails}
                  folderButtons={folderContent?.buttons}
                  folderMonitors={folderContent?.monitors}
                  buttonStatuses={buttonStatuses}
                  onButtonContextMenu={(e, button) =>
                    handleItemContextMenu(e, 'button', button)
                  }
                  onContextMenu={(e) =>
                    handleItemContextMenu(
                      e,
                      item.type as 'button' | 'folder' | 'monitor',
                      item.data
                    )
                  }
                />
              );
            })}
          </div>
        </SortableContext>
      )}

      {/* 搜索无结果 */}
      {searchQuery && !hasContent && (
        <div className="text-center py-16 text-base-content/50">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-lg mb-2">未找到匹配项</p>
          <p className="text-sm">尝试其他关键词</p>
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
