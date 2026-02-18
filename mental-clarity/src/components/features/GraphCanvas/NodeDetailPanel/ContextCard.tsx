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
          <div key={i} className={styles.contextSegment}>
            <blockquote className={styles.contextQuote}>
              {seg.text}
            </blockquote>
            <div className={styles.contextMeta}>
              <span>
                {new Date(seg.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className={styles.metaDot}>·</span>
              <span>{seg.dumpId.slice(0, 8)}</span>
            </div>
          </div>
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
