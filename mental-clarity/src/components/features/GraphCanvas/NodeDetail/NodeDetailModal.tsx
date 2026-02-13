import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import type { NodeData } from '../Node';
import styles from './NodeDetailModal.module.css';

interface NodeDetailModalProps {
  node: NodeData;
  onUpdate: (id: string, updates: Partial<Pick<NodeData, 'label' | 'content'>>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function NodeDetailModal({ node, onUpdate, onDelete, onClose }: NodeDetailModalProps) {
  const [label, setLabel] = useState(node.label);
  const [content, setContent] = useState(node.content ?? '');
  const [isClosing, setIsClosing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Focus label on open
  useEffect(() => {
    labelRef.current?.focus();
    labelRef.current?.select();
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const updates: Partial<Pick<NodeData, 'label' | 'content'>> = {};
      if (label !== node.label) updates.label = label;
      if (content !== (node.content ?? '')) updates.content = content;
      if (Object.keys(updates).length > 0) {
        onUpdate(node.id, updates);
      }
    }, 500);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [label, content, node.id, node.label, node.content, onUpdate]);

  const handleClose = useCallback(() => {
    // Flush any pending save
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    const updates: Partial<Pick<NodeData, 'label' | 'content'>> = {};
    if (label !== node.label) updates.label = label;
    if (content !== (node.content ?? '')) updates.content = content;
    if (Object.keys(updates).length > 0) {
      onUpdate(node.id, updates);
    }

    setIsClosing(true);
    setTimeout(onClose, 250);
  }, [label, content, node, onUpdate, onClose]);

  const handleDelete = useCallback(() => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    setIsClosing(true);
    setTimeout(() => onDelete(node.id), 250);
  }, [showDeleteConfirm, node.id, onDelete]);

  // Keyboard: Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleClose, showDeleteConfirm]);

  // Click outside the backdrop to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const createdDate = new Date(node.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(styles.backdrop, isClosing && styles.closing)}
      onClick={handleBackdropClick}
    >
      <div className={cn(styles.modal, isClosing && styles.closing)}>
        <input
          ref={labelRef}
          className={styles.labelInput}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Thought..."
          maxLength={50}
          spellCheck={false}
        />

        <textarea
          className={styles.contentArea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add more detail..."
          rows={4}
        />

        <div className={styles.footer}>
          <span className={styles.timestamp}>{createdDate}</span>

          <div className={styles.actions}>
            {showDeleteConfirm ? (
              <>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.confirmDeleteBtn}
                  onClick={handleDelete}
                >
                  Confirm Delete
                </button>
              </>
            ) : (
              <button className={styles.deleteBtn} onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
