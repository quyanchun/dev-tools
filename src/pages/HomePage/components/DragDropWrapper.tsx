import { useState, ReactNode, createContext, useContext } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useUnifiedStore, UnifiedItem } from '../../../store/unifiedStore';
import { useLogStore } from '../../../store/logStore';
import ButtonCard from './ButtonCard';
import MonitorCard from './MonitorCard';
import FolderCardPreview from './FolderCardPreview';
import type { Button, Monitor, Folder } from '../../../types';

interface DragDropContextType {
  activeItem: UnifiedItem | null;
  isRootOver: boolean;
}

const DragDropContext = createContext<DragDropContextType>({
  activeItem: null,
  isRootOver: false,
});

export const useDragDrop = () => useContext(DragDropContext);

interface DragDropWrapperProps {
  children: ReactNode;
}

export default function DragDropWrapper({ children }: DragDropWrapperProps) {
  const { items, reorderItems } = useUnifiedStore();
  const { addLog } = useLogStore();
  const [activeItem, setActiveItem] = useState<UnifiedItem | null>(null);

  // 根目录 droppable - 用于检测 isOver
  const { isOver: isRootOver } = useDroppable({
    id: 'root-droppable',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 移动后才触发拖拽，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = String(active.id);
    
    // Find the item being dragged (unified approach)
    const item = items.find((i) => {
      if (i.type === 'monitor') return `monitor-${i.id}` === activeId;
      if (i.type === 'folder') return `folder-${i.id}` === activeId;
      return i.id === activeId; // button
    });
    
    setActiveItem(item || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    console.log('[DragDropWrapper] handleDragEnd called:', { active: active.id, over: over?.id });

    if (!over) {
      console.log('[DragDropWrapper] No drop target, canceling');
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    console.log('[DragDropWrapper] Processing drop:', { activeId, overId });

    // Extract the actual item ID from the drag ID
    let draggedItemId = activeId;
    if (activeId.startsWith('monitor-')) {
      draggedItemId = activeId.substring('monitor-'.length);
    } else if (activeId.startsWith('folder-')) {
      draggedItemId = activeId.substring('folder-'.length);
    } else if (activeId.startsWith('button-')) {
      draggedItemId = activeId.substring('button-'.length);
    }

    console.log('[DragDropWrapper] Dragged item ID:', draggedItemId);

    // Find the dragged item
    const draggedItem = items.find((i) => i.id === draggedItemId);
    if (!draggedItem) {
      console.error('[DragDropWrapper] Dragged item not found:', draggedItemId);
      return;
    }

    console.log('[DragDropWrapper] Found dragged item:', draggedItem);

    // Determine target container and position
    let targetFolderId: string | null = null;
    let targetPosition: number;

    // Case 1: Dropped on a folder
    if (overId.startsWith('folder-')) {
      const folderId = overId.substring('folder-'.length);
      
      // Check if dragged item is also a folder
      if (draggedItem.type === 'folder') {
        // Folders cannot be nested - treat this as reordering at root level
        // Find the target folder's position and insert before it
        const targetFolder = items.find((i) => i.id === folderId);
        if (!targetFolder) {
          console.error('[DragDropWrapper] Target folder not found:', folderId);
          return;
        }
        
        targetFolderId = null; // Stay at root level
        targetPosition = targetFolder.position;
        console.log('[DragDropWrapper] Case 1a: Folder dropped on folder (reorder at root)', { targetPosition });
      } else {
        // Non-folder items can be moved into folders
        targetFolderId = folderId;
        
        // Get items in target folder to determine position
        const folderItems = items.filter((i) => i.folder_id === folderId);
        targetPosition = folderItems.length; // Add to end of folder
        console.log('[DragDropWrapper] Case 1b: Item dropped on folder (move into folder)', { folderId, targetPosition });
      }
    }
    // Case 2: Dropped on root droppable areas - move to root
    else if (
      overId === 'root-droppable' ||
      overId === 'root-droppable-bottom' ||
      overId === 'root-droppable-left' ||
      overId === 'root-droppable-right'
    ) {
      targetFolderId = null;
      
      // Get items in root to determine position
      const rootItems = items.filter((i) => i.folder_id === null);
      targetPosition = rootItems.length; // Add to end of root
      console.log('[DragDropWrapper] Case 2: Dropped on root', { targetPosition });
    }
    // Case 3: Dropped on another item - reorder within same container
    else {
      // Extract target item ID
      let targetItemId = overId;
      if (overId.startsWith('monitor-')) {
        targetItemId = overId.substring('monitor-'.length);
      } else if (overId.startsWith('folder-')) {
        targetItemId = overId.substring('folder-'.length);
      } else if (overId.startsWith('button-')) {
        targetItemId = overId.substring('button-'.length);
      }

      const targetItem = items.find((i) => i.id === targetItemId);
      if (!targetItem) {
        console.error('[DragDropWrapper] Target item not found:', targetItemId);
        return;
      }

      // Reorder within the same container
      targetFolderId = targetItem.folder_id;
      
      // Get all items in the target container
      const containerItems = items
        .filter((i) => i.folder_id === targetFolderId)
        .sort((a, b) => a.position - b.position);

      // Find target position
      const targetIndex = containerItems.findIndex((i) => i.id === targetItemId);
      if (targetIndex === -1) {
        console.error('[DragDropWrapper] Target index not found');
        return;
      }

      targetPosition = targetIndex;
      console.log('[DragDropWrapper] Case 3: Dropped on item', { targetItemId, targetPosition });
    }

    // Only proceed if something changed
    if (
      draggedItem.folder_id === targetFolderId &&
      draggedItem.position === targetPosition
    ) {
      console.log('[DragDropWrapper] No change in position, skipping');
      return;
    }

    console.log('[DragDropWrapper] Calling reorderItems:', {
      draggedItemId,
      targetPosition,
      targetFolderId,
    });

    try {
      // Use unified store's reorderItems method
      await reorderItems(draggedItemId, targetPosition, targetFolderId);
      console.log('[DragDropWrapper] Successfully reordered items');
    } catch (error) {
      console.error('[DragDropWrapper] Failed to reorder items:', error);
      addLog({
        id: crypto.randomUUID(),
        button_id: null,
        monitor_id: null,
        level: 'error',
        message: `Failed to reorder items: ${error}`,
        timestamp: Math.floor(Date.now() / 1000),
      });
    }
  };

  return (
    <DragDropContext.Provider value={{ activeItem, isRootOver }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}

        {/* 拖拽预览 */}
        <DragOverlay>
          {activeItem ? (
            <div className="opacity-90 scale-105 shadow-2xl">
              {activeItem.type === 'button' && (
                <ButtonCard
                  button={activeItem.data as Button}
                  onExecute={() => {}}
                  status="idle"
                />
              )}
              {activeItem.type === 'monitor' && (
                <MonitorCard
                  monitor={activeItem.data as Monitor}
                  onShowDetails={() => {}}
                />
              )}
              {activeItem.type === 'folder' && (
                <FolderCardPreview folder={activeItem.data as Folder} />
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DragDropContext.Provider>
  );
}
