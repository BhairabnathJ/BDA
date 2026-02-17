import { useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { NodeKind } from '@/types/graph';
import styles from './Node.module.css';

interface NodeProps {
  id: string;
  label: string;
  kind?: NodeKind;
  category?: string;
  parentIds?: string[];
  x: number;
  y: number;
  isSelected?: boolean;
  isDragging?: boolean;
  onDragStart: (id: string, e: React.MouseEvent) => void;
}

function computeSize(label: string, kind?: NodeKind): number {
  if (kind === 'umbrella') {
    const len = label.length;
    if (len <= 6) return 110;
    if (len <= 12) return 130;
    return 150;
  }
  const len = label.length;
  if (len <= 4) return 60;
  if (len <= 8) return 80;
  if (len <= 14) return 100;
  return 120;
}

export function Node({
  id,
  label,
  kind,
  category,
  parentIds,
  x,
  y,
  isSelected = false,
  isDragging = false,
  onDragStart,
}: NodeProps) {
  const size = useMemo(() => computeSize(label, kind), [label, kind]);
  const isMultiParent = (parentIds?.length ?? 0) > 1;
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;

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
        kind === 'umbrella' && styles.umbrella,
        category && styles[category],
        isMultiParent && styles.multiParent,
        isSelected && styles.selected,
        isDragging && styles.dragging,
      )}
      style={{
        width: size,
        height: size,
        left: safeX - size / 2,
        top: safeY - size / 2,
      }}
      onMouseDown={handleMouseDown}
    >
      <span className={styles.label}>{label}</span>
      {isMultiParent && <span className={styles.sharedBadge}>{'\u25CE'}</span>}
    </div>
  );
}
