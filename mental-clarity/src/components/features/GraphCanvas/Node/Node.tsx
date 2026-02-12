import { useCallback } from 'react';
import { cn } from '@/utils/cn';
import styles from './Node.module.css';

interface NodeProps {
  id: string;
  label: string;
  x: number;
  y: number;
  size?: number;
  isSelected?: boolean;
  isDragging?: boolean;
  onDragStart: (id: string, e: React.MouseEvent) => void;
}

export function Node({
  id,
  label,
  x,
  y,
  size = 80,
  isSelected = false,
  isDragging = false,
  onDragStart,
}: NodeProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      onDragStart(id, e);
    },
    [id, onDragStart],
  );

  return (
    <div
      className={cn(
        styles.node,
        isSelected && styles.selected,
        isDragging && styles.dragging,
      )}
      style={{
        width: size,
        height: size,
        left: x - size / 2,
        top: y - size / 2,
      }}
      onMouseDown={handleMouseDown}
    >
      <span className={styles.label}>{label}</span>
    </div>
  );
}
