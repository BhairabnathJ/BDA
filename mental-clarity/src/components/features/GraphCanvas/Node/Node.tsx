import { useCallback } from 'react';
import { cn } from '@/utils/cn';
import styles from './Node.module.css';
import type { NodeCategory } from './types';

interface NodeProps {
  id: string;
  label: string;
  x: number;
  y: number;
  size?: number;
  category: NodeCategory;
  isSelected?: boolean;
  onSelect: (id: string) => void;
}

export function Node({
  id,
  label,
  x,
  y,
  size = 80,
  category,
  isSelected = false,
  onSelect,
}: NodeProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(id);
    },
    [id, onSelect],
  );

  return (
    <div
      className={cn(styles.node, styles[category], isSelected && styles.selected)}
      style={{
        width: size,
        height: size,
        transform: `translate(${x - size / 2}px, ${y - size / 2}px)`,
      }}
      onClick={handleClick}
    >
      <span className={styles.label}>{label}</span>
    </div>
  );
}
