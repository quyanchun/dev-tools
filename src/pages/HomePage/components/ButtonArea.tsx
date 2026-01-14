import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useLauncherStore } from '../../../store/launcherStore';
import { useDragDrop } from './DragDropWrapper';
import DraggableButton from './DraggableButton';
import FolderCard from './FolderCard';
import type { Button } from '../../../types';

interface ButtonAreaProps {
  onExecute: (id: string) => void;
  buttonStatuses: Record<string, 'idle' | 'running' | 'success' | 'error'>;
  searchQuery: string;
}

export default function ButtonArea({
  onExecute,
  buttonStatuses,
  searchQuery,
}: ButtonAreaProps) {
  const { buttons, folders } = useLauncherStore();
  const { activeButton, isRootOver } = useDragDrop();

  // 根目录 droppable
  const { setNodeRef: setRootRef } = useDroppable({
    id: 'root-droppable',
  });

  // 过滤按钮（搜索功能）
  const filteredButtons = searchQuery
    ? buttons.filter((btn) =>
        btn.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : buttons;

  // 只显示根目录的按钮（不在文件夹内的）
  const rootButtons = filteredButtons.filter((b) => !b.folder_id);

  // 构建文件夹映射
  const folderMap = folders.reduce((acc, folder) => {
    acc[folder.id] = {
      folder,
      buttons: filteredButtons.filter((b) => b.folder_id === folder.id),
    };
    return acc;
  }, {} as Record<string, { folder: typeof folders[0]; buttons: Button[] }>);

  // 所有根目录项目的 ID（文件夹 + 按钮）
  const allRootItemIds = [
    ...folders.map(f => `folder-${f.id}`),
    ...rootButtons.map(b => b.id)
  ];

  return (
    <div ref={setRootRef}>
      {/* 根目录拖拽提示 */}
      {isRootOver && activeButton?.folder_id && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="glass-card p-6 animate-bounce-in">
            <p className="text-lg font-semibold text-primary">
              松开以移出文件夹
            </p>
          </div>
        </div>
      )}

      {/* 统一网格：文件夹和按钮混合显示 */}
      {(folders.length > 0 || rootButtons.length > 0) && (
        <SortableContext
          items={allRootItemIds}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-6">
            {/* 渲染文件夹 */}
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                buttons={folderMap[folder.id]?.buttons || []}
                onExecute={onExecute}
                buttonStatuses={buttonStatuses}
              />
            ))}

            {/* 渲染根目录按钮 */}
            {rootButtons.map((button) => (
              <DraggableButton
                key={button.id}
                button={button}
                onExecute={onExecute}
                status={buttonStatuses[button.id] || 'idle'}
              />
            ))}
          </div>
        </SortableContext>
      )}

      {/* 搜索无结果 */}
      {searchQuery && filteredButtons.length === 0 && (
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
          <p className="text-lg mb-2">未找到匹配的按钮</p>
          <p className="text-sm">尝试使用其他关键词搜索</p>
        </div>
      )}
    </div>
  );
}
