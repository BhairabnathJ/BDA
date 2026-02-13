import { cn } from '@/utils/cn';
import type { NodeData, EdgeData } from '../Node';
import styles from './NodeDetailPanel.module.css';

interface ConnectionCardProps {
  node: NodeData;
  edge: EdgeData;
  onNavigate: (nodeId: string) => void;
  onRemove: (edgeId: string) => void;
}

export function ConnectionCard({ node, edge, onNavigate, onRemove }: ConnectionCardProps) {
  const strength = edge.strength ?? 3;

  return (
    <div className={styles.connectionCard}>
      <div className={styles.connectionDot} />
      <span className={styles.connectionLabel}>{node.label}</span>
      <div className={styles.connectionStrength}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(styles.strengthDot, i <= strength && styles.active)}
          />
        ))}
      </div>
      <div className={styles.connectionActions}>
        <button
          className={styles.connectionActionBtn}
          onClick={() => onNavigate(node.id)}
        >
          Open →
        </button>
        <button
          className={cn(styles.connectionActionBtn, styles.remove)}
          onClick={() => onRemove(edge.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
