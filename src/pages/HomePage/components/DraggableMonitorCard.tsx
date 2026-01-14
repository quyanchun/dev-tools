import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MonitorCard from './MonitorCard';
import type { Monitor } from '../../../types';

interface DraggableMonitorCardProps {
  monitor: Monitor;
  onShowDetails: (monitor: Monitor) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function DraggableMonitorCard({ 
  monitor, 
  onShowDetails,
  onContextMenu,
}: DraggableMonitorCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `monitor-${monitor.id}`,
    data: {
      type: 'monitor',
      monitor,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? 'z-50' : ''}
      data-context-item="monitor"
      onContextMenu={onContextMenu}
    >
      <MonitorCard monitor={monitor} onShowDetails={onShowDetails} />
    </div>
  );
}
