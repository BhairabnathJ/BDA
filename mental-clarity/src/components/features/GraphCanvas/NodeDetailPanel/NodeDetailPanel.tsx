import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import type { NodeData, EdgeData } from '../Node';
import { PanelHeader } from './PanelHeader';
import { RichTextEditor } from './RichTextEditor';
import { ConnectionsSection } from './ConnectionsSection';
import styles from './NodeDetailPanel.module.css';

interface NodeDetailPanelProps {
  node: NodeData;
  nodes: NodeData[];
  edges: EdgeData[];
  onUpdate: (id: string, updates: Partial<Pick<NodeData, 'label' | 'content'>>) => void;
  onDelete: (id: string) => void;
  onAddEdge: (sourceId: string, targetId: string) => void;
  onRemoveEdge: (edgeId: string) => void;
  onNavigate: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeDetailPanel({
  node,
  nodes,
  edges,
  onUpdate,
  onDelete,
  onAddEdge,
  onRemoveEdge,
  onNavigate,
  onClose,
}: NodeDetailPanelProps) {
  const [label, setLabel] = useState(node.label);
  const [isClosing, setIsClosing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const labelSaveTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Auto-save label with debounce
  useEffect(() => {
    if (label === node.label) return;
    if (labelSaveTimeout.current) clearTimeout(labelSaveTimeout.current);
    labelSaveTimeout.current = setTimeout(() => {
      onUpdate(node.id, { label });
    }, 500);
    return () => {
      if (labelSaveTimeout.current) clearTimeout(labelSaveTimeout.current);
    };
  }, [label, node.id, node.label, onUpdate]);

  // Scroll detection for header border
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleScroll = () => setIsScrolled(el.scrollTop > 4);
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClose = useCallback(() => {
    // Flush pending label save
    if (labelSaveTimeout.current) {
      clearTimeout(labelSaveTimeout.current);
      if (label !== node.label) {
        onUpdate(node.id, { label });
      }
    }
    setIsClosing(true);
    setTimeout(onClose, 250);
  }, [label, node.id, node.label, onUpdate, onClose]);

  const handleDelete = useCallback(() => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    setIsClosing(true);
    setTimeout(() => onDelete(node.id), 250);
  }, [showDeleteConfirm, node.id, onDelete]);

  const handleContentUpdate = useCallback(
    (html: string) => {
      onUpdate(node.id, { content: html });
    },
    [node.id, onUpdate],
  );

  // Keyboard shortcuts
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

  // Backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  return (
    <>
      <div
        className={cn(styles.backdrop, isClosing && styles.closing)}
        onClick={handleBackdropClick}
      />
      <div className={cn(styles.panel, isClosing && styles.closing)}>
        <PanelHeader
          node={node}
          label={label}
          onLabelChange={setLabel}
          isScrolled={isScrolled}
          onClose={handleClose}
        />

        <div ref={contentRef} className={styles.content}>
          <RichTextEditor
            content={node.content ?? ''}
            onUpdate={handleContentUpdate}
          />

          <ConnectionsSection
            currentNodeId={node.id}
            nodes={nodes}
            edges={edges}
            onAddEdge={onAddEdge}
            onRemoveEdge={onRemoveEdge}
            onNavigate={onNavigate}
          />
        </div>

        <div className={styles.footer}>
          <div className={styles.footerActions}>
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
                Delete thought
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
