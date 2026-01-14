import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import DraggableButton from './DraggableButton';
import type { Folder, Button } from '../../../types';

interface FolderCardProps {
  folder: Folder;
  buttons: Button[];
  onExecute: (id: string) => void;
  buttonStatuses: Record<string, 'idle' | 'running' | 'success' | 'error'>;
}

export default function FolderCard({
  folder,
  buttons,
  onExecute,
  buttonStatuses,
}: FolderCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 文件夹本身可拖拽排序
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `folder-${folder.id}`,
    data: {
      type: 'folder',
      folder,
    },
  });

  // 文件夹图标的 droppable（用于拖入文件夹）
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: {
      type: 'folder',
      folder,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 合并两个 ref
  const setRefs = (node: HTMLDivElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  // 获取前9个按钮用于预览
  const previewButtons = buttons.slice(0, 9);
  const hasMore = buttons.length > 9;

  return (
    <>
      {/* 文件夹图标 - 未展开状态 */}
      {!isOpen && (
        <div
          ref={setRefs}
          style={style}
          {...attributes}
          {...listeners}
          className={`glass-card cursor-pointer transition-all duration-300 w-[120px] h-[120px] relative group ${
            isOver ? 'ring-2 ring-primary scale-105' : 'hover:scale-105'
          } ${isDragging ? 'z-50' : ''}`}
          onClick={() => setIsOpen(true)}
        >
          {/* 文件夹背景 */}
          <div className="absolute inset-0 rounded-[20px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
          </div>

          {/* 9宫格预览 */}
          <div className="relative h-full p-3 flex flex-col">
            {/* 预览网格 */}
            <div className="flex-1 grid grid-cols-3 gap-1 mb-2">
              {previewButtons.map((button) => (
                <div
                  key={button.id}
                  className="flex items-center justify-center text-xl bg-base-100/30 rounded-lg backdrop-blur-sm"
                >
                  {button.icon || '📦'}
                </div>
              ))}
              {/* 填充空白格子 */}
              {Array.from({ length: Math.max(0, 9 - previewButtons.length) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="bg-base-100/10 rounded-lg"
                ></div>
              ))}
            </div>

            {/* 文件夹名称 */}
            <div className="text-center">
              <h3 className="font-semibold text-xs truncate px-1">
                {folder.name}
              </h3>
              <p className="text-[10px] text-base-content/60">
                {buttons.length} 项
              </p>
            </div>

            {/* 更多指示器 */}
            {hasMore && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {buttons.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 展开的文件夹 - 优化尺寸 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="glass-modal w-[70vw] max-w-[1000px] h-[70vh] flex flex-col animate-scale-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 文件夹头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-base-300/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{folder.icon || '📁'}</div>
                <div>
                  <h2 className="text-2xl font-bold">{folder.name}</h2>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    {buttons.length} 个按钮
                  </p>
                </div>
              </div>
              <button
                className="btn btn-circle btn-ghost"
                onClick={() => setIsOpen(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 文件夹内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {buttons.length > 0 ? (
                <SortableContext
                  items={buttons.map((b) => b.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
                    {buttons.map((button) => (
                      <DraggableButton
                        key={button.id}
                        button={button}
                        onExecute={onExecute}
                        status={buttonStatuses[button.id] || 'idle'}
                      />
                    ))}
                  </div>
                </SortableContext>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-base-content/50">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-base font-medium mb-1">文件夹为空</p>
                    <p className="text-sm">拖拽按钮到这里</p>
                  </div>
                </div>
              )}
            </div>

            {/* 底部提示 */}
            <div className="px-6 py-3 border-t border-base-300/50 flex-shrink-0 bg-base-100/30">
              <div className="flex items-center justify-center gap-2 text-xs text-base-content/60">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>拖拽按钮到模态框外可移出文件夹</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
