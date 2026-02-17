import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { EmptyState } from './EmptyState';
import { Node } from './Node';
import type { NodeData } from './Node';
import { ConnectionsLayer } from './ConnectionsLayer/ConnectionsLayer';
import { useForceLayout } from '@/hooks/useForceLayout';
import type { ConnectionData } from '@/types/graph';
import styles from './GraphCanvas.module.css';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const CLICK_THRESHOLD_PX = 3;
const MOMENTUM_FRICTION = 0.92;
const MOMENTUM_MIN_VELOCITY = 0.5;

interface GraphCanvasProps {
  nodes: NodeData[];
  connections?: ConnectionData[];
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeClick?: (id: string) => void;
  onNodeDragMove?: (nodeId: string, screenX: number, screenY: number) => void;
  onNodeDrop?: (nodeId: string, screenX: number, screenY: number) => void;
}

export function GraphCanvas({ nodes, connections = [], onNodeMove, onNodeClick, onNodeDragMove, onNodeDrop }: GraphCanvasProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [hasMomentum, setHasMomentum] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Force-directed layout
  const { setDragging } = useForceLayout(nodes, connections, onNodeMove);

  const panDragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const didPanDrag = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0, t: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const momentumRaf = useRef<number>(0);

  // Node drag refs
  const nodeDragState = useRef<{
    nodeId: string;
    initialMouseX: number;
    initialMouseY: number;
    initialNodeX: number;
    initialNodeY: number;
    didMove: boolean;
  } | null>(null);

  // --- Canvas pan handlers ---

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      // Cancel any ongoing momentum
      if (momentumRaf.current) {
        cancelAnimationFrame(momentumRaf.current);
        momentumRaf.current = 0;
        setHasMomentum(false);
      }

      setIsPanning(true);
      didPanDrag.current = false;
      panDragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { x: pan.x, y: pan.y };
      lastMouse.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      velocity.current = { x: 0, y: 0 };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning || draggingNodeId) return;
      const dx = e.clientX - panDragStart.current.x;
      const dy = e.clientY - panDragStart.current.y;
      if (Math.abs(dx) > CLICK_THRESHOLD_PX || Math.abs(dy) > CLICK_THRESHOLD_PX) {
        didPanDrag.current = true;
      }

      // Track velocity
      const now = Date.now();
      const dt = now - lastMouse.current.t;
      if (dt > 0) {
        velocity.current = {
          x: (e.clientX - lastMouse.current.x) / dt * 16,
          y: (e.clientY - lastMouse.current.y) / dt * 16,
        };
      }
      lastMouse.current = { x: e.clientX, y: e.clientY, t: now };

      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    },
    [isPanning, draggingNodeId],
  );

  const handleMouseUp = useCallback(() => {
    if (!isPanning) return;
    setIsPanning(false);

    // Apply momentum if velocity is significant
    const vx = velocity.current.x;
    const vy = velocity.current.y;
    if (Math.abs(vx) > MOMENTUM_MIN_VELOCITY || Math.abs(vy) > MOMENTUM_MIN_VELOCITY) {
      setHasMomentum(true);
      const currentVel = { x: vx, y: vy };

      const animate = () => {
        currentVel.x *= MOMENTUM_FRICTION;
        currentVel.y *= MOMENTUM_FRICTION;

        if (Math.abs(currentVel.x) < MOMENTUM_MIN_VELOCITY && Math.abs(currentVel.y) < MOMENTUM_MIN_VELOCITY) {
          setHasMomentum(false);
          momentumRaf.current = 0;
          return;
        }

        setPan((prev) => ({
          x: prev.x + currentVel.x,
          y: prev.y + currentVel.y,
        }));

        momentumRaf.current = requestAnimationFrame(animate);
      };

      momentumRaf.current = requestAnimationFrame(animate);
    }
  }, [isPanning]);

  // Cleanup momentum on unmount
  useEffect(() => {
    return () => {
      if (momentumRaf.current) cancelAnimationFrame(momentumRaf.current);
    };
  }, []);

  const handleCanvasClick = useCallback(() => {
    if (!didPanDrag.current) {
      setSelectedNodeId(null);
    }
  }, []);

  // Zoom via native wheel listener (passive: false to allow preventDefault)
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const draggingNodeIdRef = useRef(draggingNodeId);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { draggingNodeIdRef.current = draggingNodeId; }, [draggingNodeId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (draggingNodeIdRef.current) return;

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      const delta = -e.deltaY * 0.004;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom * (1 + delta)));
      const scale = newZoom / currentZoom;

      setPan({
        x: mouseX - scale * (mouseX - currentPan.x),
        y: mouseY - scale * (mouseY - currentPan.y),
      });
      setZoom(newZoom);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

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
        didMove: false,
      };

      setDraggingNodeId(nodeId);
      setDragging(nodeId);
    },
    [nodes, setDragging],
  );

  useEffect(() => {
    const handleDocMouseMove = (e: MouseEvent) => {
      const state = nodeDragState.current;
      if (!state) return;

      const dx = e.clientX - state.initialMouseX;
      const dy = e.clientY - state.initialMouseY;

      if (Math.abs(dx) > CLICK_THRESHOLD_PX || Math.abs(dy) > CLICK_THRESHOLD_PX) {
        state.didMove = true;
      }

      const newX = state.initialNodeX + dx / zoom;
      const newY = state.initialNodeY + dy / zoom;

      onNodeMove(state.nodeId, newX, newY);

      // Emit screen-space position for drag-to-archive hit testing
      if (state.didMove) {
        onNodeDragMove?.(state.nodeId, e.clientX, e.clientY);
      }
    };

    const handleDocMouseUp = (e: MouseEvent) => {
      const state = nodeDragState.current;
      if (state) {
        if (state.didMove) {
          // Emit drop position for archive zone hit testing
          onNodeDrop?.(state.nodeId, e.clientX, e.clientY);
        } else {
          setSelectedNodeId(state.nodeId);
          onNodeClick?.(state.nodeId);
        }
      }

      nodeDragState.current = null;
      setDraggingNodeId(null);
      setDragging(null);
    };

    document.addEventListener('mousemove', handleDocMouseMove);
    document.addEventListener('mouseup', handleDocMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUp);
    };
  }, [zoom, onNodeMove, onNodeClick, onNodeDragMove, onNodeDrop, setDragging]);

  const hasNodes = nodes.length > 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-dot-grid',
        styles.container,
        (isPanning || hasMomentum) && !draggingNodeId && styles.panning,
        draggingNodeId && styles.draggingNode,
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      <div
        className={styles.surface}
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
        }}
      >
        <ConnectionsLayer connections={connections} nodes={nodes} />
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
