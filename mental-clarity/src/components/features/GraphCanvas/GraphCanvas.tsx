import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { EmptyState } from './EmptyState';
import { Node } from './Node';
import type { NodeData } from './Node';
import { ConnectionsLayer } from './ConnectionsLayer/ConnectionsLayer';
import { useGraphLayout } from '@/hooks/useGraphLayout';
import type { ConnectionData } from '@/types/graph';
import styles from './GraphCanvas.module.css';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const CLICK_THRESHOLD_PX = 3;
const MOMENTUM_FRICTION = 0.92;
const MOMENTUM_MIN_VELOCITY = 0.5;
const DEFAULT_SPREAD = 420;

interface GraphCanvasProps {
  nodes: NodeData[];
  connections?: ConnectionData[];
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeClick?: (id: string) => void;
  onNodeDragMove?: (nodeId: string, screenX: number, screenY: number) => void;
  onNodeDrop?: (nodeId: string, screenX: number, screenY: number) => void;
}

export function GraphCanvas({ nodes, connections = [], onNodeMove, onNodeClick, onNodeDragMove, onNodeDrop }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [hasMomentum, setHasMomentum] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [lockPositions, setLockPositions] = useState(false);
  const [layoutSpread, setLayoutSpread] = useState(DEFAULT_SPREAD);
  const [canvasSize, setCanvasSize] = useState({
    width: typeof window === 'undefined' ? 1200 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  });

  const {
    isComputing,
    setDragging: setLayoutDragging,
    pinNode,
    resetLayout,
  } = useGraphLayout({
    nodes,
    connections,
    onNodeMove,
    enabled: true,
    lockPositions,
    repulsionStrength: layoutSpread,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
  });

  const panDragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const didPanDrag = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0, t: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const momentumRaf = useRef<number>(0);

  const nodeDragState = useRef<{
    nodeId: string;
    initialMouseX: number;
    initialMouseY: number;
    initialNodeX: number;
    initialNodeY: number;
    didMove: boolean;
  } | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateCanvasSize = () => {
      const rect = element.getBoundingClientRect();
      setCanvasSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };

    updateCanvasSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateCanvasSize();
      });
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return;

      if (momentumRaf.current) {
        cancelAnimationFrame(momentumRaf.current);
        momentumRaf.current = 0;
        setHasMomentum(false);
      }

      setIsPanning(true);
      didPanDrag.current = false;
      panDragStart.current = { x: event.clientX, y: event.clientY };
      panStart.current = { x: pan.x, y: pan.y };
      lastMouse.current = { x: event.clientX, y: event.clientY, t: Date.now() };
      velocity.current = { x: 0, y: 0 };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isPanning || draggingNodeId) return;
      const dx = event.clientX - panDragStart.current.x;
      const dy = event.clientY - panDragStart.current.y;
      if (Math.abs(dx) > CLICK_THRESHOLD_PX || Math.abs(dy) > CLICK_THRESHOLD_PX) {
        didPanDrag.current = true;
      }

      const now = Date.now();
      const dt = now - lastMouse.current.t;
      if (dt > 0) {
        velocity.current = {
          x: (event.clientX - lastMouse.current.x) / dt * 16,
          y: (event.clientY - lastMouse.current.y) / dt * 16,
        };
      }
      lastMouse.current = { x: event.clientX, y: event.clientY, t: now };

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

    const vx = velocity.current.x;
    const vy = velocity.current.y;
    if (Math.abs(vx) > MOMENTUM_MIN_VELOCITY || Math.abs(vy) > MOMENTUM_MIN_VELOCITY) {
      setHasMomentum(true);
      const currentVelocity = { x: vx, y: vy };

      const animate = () => {
        currentVelocity.x *= MOMENTUM_FRICTION;
        currentVelocity.y *= MOMENTUM_FRICTION;

        if (Math.abs(currentVelocity.x) < MOMENTUM_MIN_VELOCITY && Math.abs(currentVelocity.y) < MOMENTUM_MIN_VELOCITY) {
          setHasMomentum(false);
          momentumRaf.current = 0;
          return;
        }

        setPan((prev) => ({
          x: prev.x + currentVelocity.x,
          y: prev.y + currentVelocity.y,
        }));

        momentumRaf.current = requestAnimationFrame(animate);
      };

      momentumRaf.current = requestAnimationFrame(animate);
    }
  }, [isPanning]);

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

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const draggingNodeIdRef = useRef(draggingNodeId);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { draggingNodeIdRef.current = draggingNodeId; }, [draggingNodeId]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (draggingNodeIdRef.current) return;

      const rect = element.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      const delta = -event.deltaY * 0.004;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom * (1 + delta)));
      const scale = newZoom / currentZoom;

      setPan({
        x: mouseX - scale * (mouseX - currentPan.x),
        y: mouseY - scale * (mouseY - currentPan.y),
      });
      setZoom(newZoom);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  const handleNodeDragStart = useCallback(
    (nodeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();

      const node = nodes.find((candidate) => candidate.id === nodeId);
      if (!node) return;

      nodeDragState.current = {
        nodeId,
        initialMouseX: event.clientX,
        initialMouseY: event.clientY,
        initialNodeX: node.x,
        initialNodeY: node.y,
        didMove: false,
      };

      setDraggingNodeId(nodeId);
      setLayoutDragging(nodeId);
    },
    [nodes, setLayoutDragging],
  );

  useEffect(() => {
    const handleDocMouseMove = (event: MouseEvent) => {
      const state = nodeDragState.current;
      if (!state) return;

      const dx = event.clientX - state.initialMouseX;
      const dy = event.clientY - state.initialMouseY;

      if (Math.abs(dx) > CLICK_THRESHOLD_PX || Math.abs(dy) > CLICK_THRESHOLD_PX) {
        state.didMove = true;
      }

      const newX = state.initialNodeX + dx / zoom;
      const newY = state.initialNodeY + dy / zoom;
      onNodeMove(state.nodeId, newX, newY);

      if (state.didMove) {
        onNodeDragMove?.(state.nodeId, event.clientX, event.clientY);
      }
    };

    const handleDocMouseUp = (event: MouseEvent) => {
      const state = nodeDragState.current;
      if (state) {
        if (state.didMove) {
          pinNode(state.nodeId);
          onNodeDrop?.(state.nodeId, event.clientX, event.clientY);
        } else {
          setSelectedNodeId(state.nodeId);
          onNodeClick?.(state.nodeId);
        }
      }

      nodeDragState.current = null;
      setDraggingNodeId(null);
      setLayoutDragging(null);
    };

    document.addEventListener('mousemove', handleDocMouseMove);
    document.addEventListener('mouseup', handleDocMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUp);
    };
  }, [zoom, onNodeMove, onNodeClick, onNodeDragMove, onNodeDrop, pinNode, setLayoutDragging]);

  const stopCanvasPropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

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
        className={styles.layoutControls}
        onMouseDown={stopCanvasPropagation}
        onClick={stopCanvasPropagation}
        onWheel={stopCanvasPropagation}
      >
        <button
          type="button"
          className={styles.controlButton}
          onClick={() => resetLayout()}
          disabled={nodes.length < 2 || lockPositions}
        >
          Reset Layout
        </button>

        <label className={styles.controlLabel}>
          <span>Spread</span>
          <input
            className={styles.slider}
            type="range"
            min={120}
            max={700}
            step={10}
            value={layoutSpread}
            onChange={(event) => setLayoutSpread(Number(event.target.value))}
            disabled={lockPositions}
          />
          <span className={styles.sliderValue}>{layoutSpread}</span>
        </label>

        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={lockPositions}
            onChange={(event) => setLockPositions(event.target.checked)}
          />
          <span>Lock positions</span>
        </label>

        <span className={cn(styles.layoutStatus, !isComputing && styles.layoutStatusIdle)}>
          {isComputing ? 'Arranging...' : 'Layout ready'}
        </span>
      </div>

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
