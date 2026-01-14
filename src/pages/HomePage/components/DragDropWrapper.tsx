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
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useLauncherStore } from '../../../store/launcherStore';
import { updateButton, updateButtonPositions, updateMonitor } from '../../../api/tauri';
import { useLogStore } from '../../../store/logStore';
import ButtonCard from './ButtonCard';
import MonitorCard from './MonitorCard';
import type { Button, Monitor } from '../../../types';

interface DragDropContextType {
  activeButton: Button | null;
  activeMonitor: Monitor | null;
  isRootOver: boolean;
}

const DragDropContext = createContext<DragDropContextType>({
  activeButton: null,
  activeMonitor: null,
  isRootOver: false,
});

export const useDragDrop = () => useContext(DragDropContext);

interface DragDropWrapperProps {
  children: ReactNode;
  monitors: Monitor[];
  onMonitorsChange: (monitors: Monitor[]) => void;
}

export default function DragDropWrapper({ children, monitors, onMonitorsChange }: DragDropWrapperProps) {
  const { buttons, setButtons } = useLauncherStore();
  const { addLog } = useLogStore();
  const [activeButton, setActiveButton] = useState<Button | null>(null);
  const [activeMonitor, setActiveMonitor] = useState<Monitor | null>(null);

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
    
    if (activeId.startsWith('monitor-')) {
      const monitorId = activeId.replace('monitor-', '');
      const monitor = monitors.find((m) => m.id === monitorId);
      setActiveMonitor(monitor || null);
      setActiveButton(null);
    } else {
      const button = buttons.find((b) => b.id === activeId);
      setActiveButton(button || null);
      setActiveMonitor(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveButton(null);
    setActiveMonitor(null);

    if (!over) return;

    const activeId = String(active.id);
    const isMonitor = activeId.startsWith('monitor-');

    // 处理监控拖拽
    if (isMonitor) {
      const monitorId = activeId.replace('monitor-', '');
      const draggedMonitor = monitors.find((m) => m.id === monitorId);
      if (!draggedMonitor) return;

      // 拖拽到文件夹
      if (typeof over.id === 'string' && over.id.startsWith('folder-')) {
        const folderId = over.id.replace('folder-', '');
        if (draggedMonitor.folder_id !== folderId) {
          try {
            const updatedMonitor = { ...draggedMonitor, folder_id: folderId };
            await updateMonitor(draggedMonitor.id, updatedMonitor);
            onMonitorsChange(monitors.map((m) => m.id === monitorId ? updatedMonitor : m));
          } catch (error) {
            console.error('移动监控到文件夹失败:', error);
          }
        }
        return;
      }

      // 拖拽到根目录
      if (over.id === 'root-droppable') {
        if (draggedMonitor.folder_id !== null) {
          try {
            const updatedMonitor = { ...draggedMonitor, folder_id: null };
            await updateMonitor(draggedMonitor.id, updatedMonitor);
            onMonitorsChange(monitors.map((m) => m.id === monitorId ? updatedMonitor : m));
          } catch (error) {
            console.error('移动监控到根目录失败:', error);
          }
        }
        return;
      }
      return;
    }

    // 处理按钮拖拽
    const activeButton = buttons.find((b) => b.id === active.id);
    if (!activeButton) return;

    // 情况 1: 拖拽到文件夹
    if (typeof over.id === 'string' && over.id.startsWith('folder-')) {
      const folderId = over.id.replace('folder-', '');
      if (activeButton.folder_id !== folderId) {
        try {
          await updateButton(activeButton.id, {
            ...activeButton,
            folder_id: folderId,
            updated_at: Math.floor(Date.now() / 1000),
          });
          // 更新本地状态
          const updatedButtons = buttons.map((btn) =>
            btn.id === activeButton.id ? { ...btn, folder_id: folderId } : btn
          );
          setButtons(updatedButtons);
        } catch (error) {
          console.error('移动按钮到文件夹失败:', error);
          addLog({
            id: crypto.randomUUID(),
            button_id: null,
            monitor_id: null,
            level: 'error',
            message: `移动按钮失败: ${error}`,
            timestamp: Math.floor(Date.now() / 1000),
          });
        }
      }
      return;
    }

    // 情况 2: 拖拽到根目录（root-droppable）
    if (over.id === 'root-droppable') {
      if (activeButton.folder_id !== null) {
        try {
          await updateButton(activeButton.id, {
            ...activeButton,
            folder_id: null,
            updated_at: Math.floor(Date.now() / 1000),
          });
          // 更新本地状态
          const updatedButtons = buttons.map((btn) =>
            btn.id === activeButton.id ? { ...btn, folder_id: null } : btn
          );
          setButtons(updatedButtons);
        } catch (error) {
          console.error('移动按钮到根目录失败:', error);
        }
      }
      return;
    }

    // 情况 3: 在同一容器内重新排序
    if (active.id !== over.id) {
      const activeIndex = buttons.findIndex((b) => b.id === active.id);
      const overIndex = buttons.findIndex((b) => b.id === over.id);

      // 确保在同一个容器内（都在根目录或都在同一文件夹）
      const activeBtn = buttons[activeIndex];
      const overBtn = buttons[overIndex];

      if (activeBtn.folder_id === overBtn.folder_id) {
        const newButtons = arrayMove(buttons, activeIndex, overIndex);
        setButtons(newButtons);

        // 更新位置到数据库
        const updates = newButtons.map((btn, index) => ({
          id: btn.id,
          position: index,
        }));

        try {
          await updateButtonPositions(updates);
        } catch (error) {
          console.error('更新按钮位置失败:', error);
          // 失败时回滚
          setButtons(buttons);
          addLog({
            id: crypto.randomUUID(),
            button_id: null,
            monitor_id: null,
            level: 'error',
            message: `更新布局失败: ${error}`,
            timestamp: Math.floor(Date.now() / 1000),
          });
        }
      }
    }
  };

  return (
    <DragDropContext.Provider value={{ activeButton, activeMonitor, isRootOver }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}

        {/* 拖拽预览 */}
        <DragOverlay>
          {activeButton ? (
            <div className="opacity-90 rotate-3 scale-105 shadow-2xl">
              <ButtonCard
                button={activeButton}
                onExecute={() => {}}
                status="idle"
              />
            </div>
          ) : activeMonitor ? (
            <div className="opacity-90 rotate-3 scale-105 shadow-2xl">
              <MonitorCard
                monitor={activeMonitor}
                onShowDetails={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DragDropContext.Provider>
  );
}
