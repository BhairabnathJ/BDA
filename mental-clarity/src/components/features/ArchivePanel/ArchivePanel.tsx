import { useCallback, useState } from 'react';
import { cn } from '@/utils/cn';
import type { NodeData } from '@/types/graph';
import styles from './ArchivePanel.module.css';

const CATEGORY_COLORS: Record<string, string> = {
  organic: '#D4A89F',
  technical: '#A8C5D1',
  creative: '#B89FB8',
  learning: '#9FB89F',
  personal: '#D4C5B5',
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface ArchivePanelProps {
  nodes: NodeData[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  onClose: () => void;
}

export function ArchivePanel({ nodes, onRestore, onDelete, onView, onClose }: ArchivePanelProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 250);
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirmDeleteId === id) {
        onDelete(id);
        setConfirmDeleteId(null);
      } else {
        setConfirmDeleteId(id);
      }
    },
    [confirmDeleteId, onDelete],
  );

  return (
    <>
      <div
        className={cn(styles.backdrop, isClosing && styles.closing)}
        onClick={handleBackdropClick}
      />
      <div className={cn(styles.panel, isClosing && styles.closing)}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.title}>Archive</span>
            {nodes.length > 0 && (
              <span className={styles.count}>{nodes.length}</span>
            )}
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>
            ✕
          </button>
        </div>

        {nodes.length === 0 ? (
          <div className={styles.empty}>No archived thoughts</div>
        ) : (
          <div className={styles.list}>
            {nodes.map((node) => (
              <div key={node.id} className={styles.card}>
                <div
                  className={styles.categoryDot}
                  style={{
                    background: CATEGORY_COLORS[node.category ?? 'personal'],
                  }}
                />
                <div
                  className={styles.cardInfo}
                  onClick={() => onView(node.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.cardLabel}>{node.label}</div>
                  <div className={styles.cardDate}>
                    {formatDate(node.createdAt)}
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.restoreBtn}
                    onClick={() => onRestore(node.id)}
                  >
                    Restore
                  </button>
                  {confirmDeleteId === node.id ? (
                    <>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className={styles.confirmDeleteBtn}
                        onClick={() => handleDelete(node.id)}
                      >
                        Confirm
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(node.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
