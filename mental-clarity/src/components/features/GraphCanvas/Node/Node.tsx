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
  onSelect: (id: string) => void;
}

export function Node({
  id,
  label,
  x,
  y,
  size = 80,
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
      className={cn(styles.node, isSelected && styles.selected)}
      style={{
        width: size,
        height: size,
        left: x - size / 2,
        top: y - size / 2,
      }}
      onClick={handleClick}
    >
      <span className={styles.label}>{label}</span>
    </div>
  );
}
