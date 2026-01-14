import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ButtonCard from './ButtonCard';
import type { Button } from '../../../types';

interface DraggableButtonProps {
  button: Button;
  onExecute: (button_id: string) => void;
  status: 'idle' | 'running' | 'success' | 'error';
}

export default function DraggableButton({ button, onExecute, status }: DraggableButtonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: button.id,
    data: {
      type: 'button',
      button,
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
    >
      <ButtonCard
        button={button}
        onExecute={onExecute}
        status={status}
      />
    </div>
  );
}
