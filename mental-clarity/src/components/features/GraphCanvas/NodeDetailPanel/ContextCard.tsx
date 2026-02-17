import type { PageContext } from '@/types/graph';
import styles from './NodeDetailPanel.module.css';

interface ContextCardProps {
  context: PageContext;
  onNavigateParent?: (parentId: string) => void;
}

export function ContextCard({ context, onNavigateParent }: ContextCardProps) {
  return (
    <div className={styles.contextCard}>
      <div className={styles.contextHeader}>
        <button
          className={styles.contextParentLink}
          onClick={() => onNavigateParent?.(context.parentId)}
        >
          {context.parentName}
        </button>
      </div>
      <div className={styles.contextSegments}>
        {context.segments.map((seg, i) => (
          <blockquote key={i} className={styles.contextQuote}>
            {seg.text}
          </blockquote>
        ))}
      </div>
      {context.summary && (
        <div className={styles.contextSummary}>
          {context.summary}
        </div>
      )}
    </div>
  );
}
