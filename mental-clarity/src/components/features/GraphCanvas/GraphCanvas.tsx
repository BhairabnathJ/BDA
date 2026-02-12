import { useCallback, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { EmptyState } from './EmptyState';
import { Node } from './Node';
import type { NodeData } from './Node';
import styles from './GraphCanvas.module.css';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

interface GraphCanvasProps {
  nodes: NodeData[];
}

export function GraphCanvas({ nodes }: GraphCanvasProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      didDrag.current = false;
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { x: pan.x, y: pan.y };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didDrag.current = true;
      }
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    },
    [isPanning],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleCanvasClick = useCallback(() => {
    if (!didDrag.current) {
      setSelectedNodeId(null);
    }
  }, []);

  const handleNodeSelect = useCallback((id: string) => {
    setSelectedNodeId(id);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (1 + delta)));
      const scale = newZoom / zoom;

      setPan({
        x: mouseX - scale * (mouseX - pan.x),
        y: mouseY - scale * (mouseY - pan.y),
      });
      setZoom(newZoom);
    },
    [zoom, pan],
  );

  const hasNodes = nodes.length > 0;

  return (
    <div
      className={cn('bg-dot-grid', styles.container, isPanning && styles.panning)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
    >
      <div
        className={styles.surface}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {nodes.map((node) => (
          <Node
            key={node.id}
            {...node}
            isSelected={node.id === selectedNodeId}
            onSelect={handleNodeSelect}
          />
        ))}
      </div>
      <div className={cn(styles.emptyStateWrapper, hasNodes && styles.hidden)}>
        <EmptyState />
      </div>
    </div>
  );
}
