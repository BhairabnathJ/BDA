import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { EmptyState } from './EmptyState';
import { Node } from './Node';
import type { NodeData } from './Node';
import styles from './GraphCanvas.module.css';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const DRAG_HOLD_MS = 150;
const DRAG_THRESHOLD_PX = 5;

interface GraphCanvasProps {
  nodes: NodeData[];
  onNodeMove: (id: string, x: number, y: number) => void;
}

export function GraphCanvas({ nodes, onNodeMove }: GraphCanvasProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const panDragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const didPanDrag = useRef(false);

  // Node drag refs
  const nodeDragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodeDragState = useRef<{
    nodeId: string;
    initialMouseX: number;
    initialMouseY: number;
    initialNodeX: number;
    initialNodeY: number;
    activated: boolean;
  } | null>(null);

  // --- Canvas pan handlers ---

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      didPanDrag.current = false;
      panDragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { x: pan.x, y: pan.y };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning || draggingNodeId) return;
      const dx = e.clientX - panDragStart.current.x;
      const dy = e.clientY - panDragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didPanDrag.current = true;
      }
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    },
    [isPanning, draggingNodeId],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleCanvasClick = useCallback(() => {
    if (!didPanDrag.current) {
      setSelectedNodeId(null);
    }
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (draggingNodeId) return;

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
    [zoom, pan, draggingNodeId],
  );

  // --- Node drag handlers ---

  const handleNodeDragStart = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      nodeDragState.current = {
        nodeId,
        initialMouseX: e.clientX,
        initialMouseY: e.clientY,
        initialNodeX: node.x,
        initialNodeY: node.y,
        activated: false,
      };

      nodeDragTimer.current = setTimeout(() => {
        if (nodeDragState.current) {
          nodeDragState.current.activated = true;
          setDraggingNodeId(nodeId);
        }
      }, DRAG_HOLD_MS);
    },
    [nodes],
  );

  // Document-level listeners for drag move/up
  useEffect(() => {
    const handleDocMouseMove = (e: MouseEvent) => {
      const state = nodeDragState.current;
      if (!state) return;

      const dx = e.clientX - state.initialMouseX;
      const dy = e.clientY - state.initialMouseY;

      // If moved beyond threshold before timer, activate immediately
      if (!state.activated && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
        if (nodeDragTimer.current) clearTimeout(nodeDragTimer.current);
        state.activated = true;
        setDraggingNodeId(state.nodeId);
      }

      if (!state.activated) return;

      const newX = state.initialNodeX + dx / zoom;
      const newY = state.initialNodeY + dy / zoom;

      // Clamp to keep at least 20% visible (40px for 80px node)
      const clampedX = Math.max(-40, newX);
      const clampedY = Math.max(-40, newY);

      onNodeMove(state.nodeId, clampedX, clampedY);
    };

    const handleDocMouseUp = () => {
      if (nodeDragTimer.current) {
        clearTimeout(nodeDragTimer.current);
        nodeDragTimer.current = null;
      }

      const state = nodeDragState.current;
      if (state && !state.activated) {
        // Was a quick click, treat as select
        setSelectedNodeId(state.nodeId);
      }

      nodeDragState.current = null;
      setDraggingNodeId(null);
    };

    document.addEventListener('mousemove', handleDocMouseMove);
    document.addEventListener('mouseup', handleDocMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUp);
    };
  }, [zoom, onNodeMove]);

  const hasNodes = nodes.length > 0;

  return (
    <div
      className={cn(
        'bg-dot-grid',
        styles.container,
        isPanning && !draggingNodeId && styles.panning,
        draggingNodeId && styles.draggingNode,
      )}
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
            isDragging={node.id === draggingNodeId}
            onDragStart={handleNodeDragStart}
          />
        ))}
      </div>
      <div className={cn(styles.emptyStateWrapper, hasNodes && styles.hidden)}>
        <EmptyState />
      </div>
    </div>
  );
}
