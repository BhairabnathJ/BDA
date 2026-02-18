import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import type { NodeData } from '../Node';
import styles from './NodeDetailPanel.module.css';

interface PanelHeaderProps {
  node: NodeData;
  mentionCount?: number;
  label: string;
  onLabelChange: (value: string) => void;
  isScrolled: boolean;
  onClose: () => void;
}

export function PanelHeader({ node, mentionCount = 0, label, onLabelChange, isScrolled, onClose }: PanelHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [node.id]);

  const createdDate = new Date(node.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const updatedDate = new Date(node.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const lastAccessText = node.lastAccessedAt
    ? new Date(node.lastAccessedAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : 'Not viewed yet';

  const wordCount = (node.content ?? '').split(/\s+/).filter(Boolean).length;

  return (
    <div className={cn(styles.header, isScrolled && styles.scrolled)}>
      <div className={styles.headerTop}>
        <input
          ref={inputRef}
          className={styles.labelInput}
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Thought..."
          maxLength={100}
          spellCheck={false}
        />
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className={styles.meta}>
        <span>Created {createdDate}</span>
        <span className={styles.metaDot}>·</span>
        <span>Edited {updatedDate}</span>
        {wordCount > 0 && (
          <>
            <span className={styles.metaDot}>·</span>
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          </>
        )}
        <span className={styles.metaDot}>·</span>
        <span>{mentionCount} mention{mentionCount === 1 ? '' : 's'}</span>
        <span className={styles.metaDot}>·</span>
        <span>Last viewed {lastAccessText}</span>
      </div>
    </div>
  );
}
