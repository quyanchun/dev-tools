import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MonitorCard from './MonitorCard';
import FolderCard from './FolderCard';
import ButtonCard from './ButtonCard';
import type { UnifiedItem } from '../../../store/unifiedStore';
import type { Monitor, Folder, Button } from '../../../types';

interface UnifiedCardProps {
  item: UnifiedItem;
  // Props for ButtonCard
  onExecute?: (button_id: string) => void;
  buttonStatus?: 'idle' | 'running' | 'success' | 'error';
  // Props for MonitorCard
  onShowMonitorDetails?: (monitor: Monitor) => void;
  // Props for FolderCard
  folderButtons?: Button[];
  folderMonitors?: Monitor[];
  buttonStatuses?: Record<string, 'idle' | 'running' | 'success' | 'error'>;
  onButtonContextMenu?: (e: React.MouseEvent, button: Button) => void;
  // Context menu for all items
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function UnifiedCard({
  item,
  onExecute,
  buttonStatus = 'idle',
  onShowMonitorDetails,
  folderButtons = [],
  folderMonitors = [],
  buttonStatuses = {},
  onButtonContextMenu,
  onContextMenu,
}: UnifiedCardProps) {
  // Use useSortable hook for drag and drop support
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${item.type}-${item.id}`,
    data: {
      type: item.type,
      item: item.data,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  // Render the appropriate card based on item type
  const renderCard = () => {
    switch (item.type) {
      case 'monitor':
        return (
          <MonitorCard
            monitor={item.data as Monitor}
            onShowDetails={onShowMonitorDetails || (() => {})}
          />
        );

      case 'folder':
        return (
          <FolderCard
            folder={item.data as Folder}
            buttons={folderButtons}
            monitors={folderMonitors}
            onExecute={onExecute || (() => {})}
            buttonStatuses={buttonStatuses}
            onContextMenu={onContextMenu}
            onButtonContextMenu={onButtonContextMenu}
            onShowMonitorDetails={onShowMonitorDetails}
          />
        );

      case 'button':
        return (
          <ButtonCard
            button={item.data as Button}
            onExecute={onExecute || (() => {})}
            status={buttonStatus}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? 'z-50' : ''}
      data-context-item={item.type}
      onContextMenu={onContextMenu}
    >
      {renderCard()}
    </div>
  );
}
