import { useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import styles from './Node.module.css';

interface NodeProps {
  id: string;
  label: string;
  x: number;
  y: number;
  category?: string;
  isSelected?: boolean;
  isDragging?: boolean;
  onDragStart: (id: string, e: React.MouseEvent) => void;
}

function computeSize(label: string): number {
  const len = label.length;
  if (len <= 4) return 60;
  if (len <= 8) return 80;
  if (len <= 14) return 100;
  return 120;
}

export function Node({
  id,
  label,
  x,
  y,
  category,
  isSelected = false,
  isDragging = false,
  onDragStart,
}: NodeProps) {
  const size = useMemo(() => computeSize(label), [label]);

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
        category && styles[category],
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
