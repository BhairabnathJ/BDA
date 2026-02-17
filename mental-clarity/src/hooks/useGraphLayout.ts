import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConnectionData, NodeData } from '@/types/graph';

interface LayoutConfig {
  nodeRadius: number;
  repulsionStrength: number;
  attractionStrength: number;
  centerGravity: number;
  iterations: number;
  initialSpread: number;
}

interface LayoutRequest {
  requestId: number;
  width: number;
  height: number;
  reset: boolean;
  newNodeIds: string[];
  movableNodeIds: string[];
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    category?: string;
    pinned?: boolean;
  }>;
  edges: Array<{
    sourceId: string;
    targetId: string;
    strength?: number;
  }>;
  config: LayoutConfig;
}

interface LayoutResponse {
  requestId: number;
  positions: Array<{ id: string; x: number; y: number }>;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeRadius: 40,
  repulsionStrength: 420,
  attractionStrength: 0.1,
  centerGravity: 0.05,
  iterations: 300,
  initialSpread: 1000,
};

interface UseGraphLayoutParams {
  nodes: NodeData[];
  connections: ConnectionData[];
  onNodeMove: (id: string, x: number, y: number) => void;
  enabled?: boolean;
  lockPositions?: boolean;
  repulsionStrength?: number;
  canvasWidth: number;
  canvasHeight: number;
}

type ConnectionSnapshot = {
  sourceId: string;
  targetId: string;
  signature: string;
};

function connectionKey(connection: ConnectionData): string {
  return connection.id;
}

function connectionSignature(connection: ConnectionData): string {
  return `${connection.sourceId}|${connection.targetId}|${connection.strength}`;
}

function buildAdjacency(connections: ConnectionData[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const connection of connections) {
    const sourceNeighbors = adjacency.get(connection.sourceId) ?? new Set<string>();
    sourceNeighbors.add(connection.targetId);
    adjacency.set(connection.sourceId, sourceNeighbors);

    const targetNeighbors = adjacency.get(connection.targetId) ?? new Set<string>();
    targetNeighbors.add(connection.sourceId);
    adjacency.set(connection.targetId, targetNeighbors);
  }
  return adjacency;
}

function expandWithNeighbors(seedIds: Set<string>, adjacency: Map<string, Set<string>>): string[] {
  const expanded = new Set<string>(seedIds);
  for (const id of seedIds) {
    const neighbors = adjacency.get(id);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      expanded.add(neighbor);
    }
  }
  return Array.from(expanded);
}

export function useGraphLayout({
  nodes,
  connections,
  onNodeMove,
  enabled = true,
  lockPositions = false,
  repulsionStrength = 420,
  canvasWidth,
  canvasHeight,
}: UseGraphLayoutParams) {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const activeRequestIdRef = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const pinnedIdsRef = useRef<Set<string>>(new Set());
  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const prevConnectionsRef = useRef<Map<string, ConnectionSnapshot>>(new Map());
  const prevRepulsionRef = useRef(repulsionStrength);
  const prevCanvasSizeRef = useRef({ width: canvasWidth, height: canvasHeight });
  const nodesRef = useRef<NodeData[]>(nodes);
  const connectionsRef = useRef<ConnectionData[]>(connections);
  const onNodeMoveRef = useRef(onNodeMove);
  const [isComputing, setIsComputing] = useState(false);

  const nodeStructureSignature = useMemo(
    () => nodes.map((node) => `${node.id}:${node.category ?? ''}`).sort().join('|'),
    [nodes],
  );

  const connectionStructureSignature = useMemo(
    () => connections
      .map((connection) => `${connection.id}:${connection.sourceId}:${connection.targetId}:${connection.strength}`)
      .sort()
      .join('|'),
    [connections],
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  useEffect(() => {
    onNodeMoveRef.current = onNodeMove;
  }, [onNodeMove]);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/layout.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<LayoutResponse>) => {
      const { requestId, positions } = event.data;
      if (requestId !== activeRequestIdRef.current) return;
      setIsComputing(false);
      for (const position of positions) {
        if (position.id === draggingIdRef.current) continue;
        if (pinnedIdsRef.current.has(position.id)) continue;
        if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) continue;
        onNodeMoveRef.current(position.id, position.x, position.y);
      }
    };

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const requestLayout = useCallback((opts: { reset: boolean; newNodeIds: string[]; movableNodeIds: string[] }) => {
    const worker = workerRef.current;
    if (!worker) return;
    if (nodesRef.current.length < 2) return;

    const movableCandidates = opts.reset
      ? nodesRef.current.map((node) => node.id)
      : Array.from(new Set([...opts.newNodeIds, ...opts.movableNodeIds]));

    const movableNodeIds = movableCandidates.filter((id) => !pinnedIdsRef.current.has(id));
    if (!opts.reset && movableNodeIds.length === 0) return;

    const requestId = ++requestIdRef.current;
    activeRequestIdRef.current = requestId;
    setIsComputing(true);

    const payload: LayoutRequest = {
      requestId,
      width: canvasWidth,
      height: canvasHeight,
      reset: opts.reset,
      newNodeIds: opts.newNodeIds,
      movableNodeIds,
      nodes: nodesRef.current.map((node) => ({
        id: node.id,
        x: Number.isFinite(node.x) ? node.x : canvasWidth * 0.5,
        y: Number.isFinite(node.y) ? node.y : canvasHeight * 0.5,
        category: node.category,
        pinned: pinnedIdsRef.current.has(node.id),
      })),
      edges: connectionsRef.current.map((connection) => ({
        sourceId: connection.sourceId,
        targetId: connection.targetId,
        strength: connection.strength,
      })),
      config: {
        ...DEFAULT_LAYOUT_CONFIG,
        repulsionStrength,
      },
    };

    worker.postMessage(payload);
  }, [canvasHeight, canvasWidth, repulsionStrength]);

  const scheduleLayout = useCallback((opts: { reset: boolean; newNodeIds: string[]; movableNodeIds: string[] }) => {
    if (!enabled || lockPositions) return;

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      requestLayout(opts);
    }, 500);
  }, [enabled, lockPositions, requestLayout]);

  const resetLayout = useCallback(() => {
    pinnedIdsRef.current.clear();
    const allNodeIds = nodesRef.current.map((node) => node.id);
    requestLayout({
      reset: true,
      newNodeIds: allNodeIds,
      movableNodeIds: allNodeIds,
    });
  }, [requestLayout]);

  const setDragging = useCallback((nodeId: string | null) => {
    draggingIdRef.current = nodeId;
  }, []);

  const pinNode = useCallback((nodeId: string) => {
    pinnedIdsRef.current.add(nodeId);
  }, []);

  const unpinAll = useCallback(() => {
    pinnedIdsRef.current.clear();
  }, []);

  useEffect(() => {
    const currentNodes = nodesRef.current;
    const currentConnectionsArray = connectionsRef.current;
    const currentNodeIds = new Set(currentNodes.map((node) => node.id));
    const previousNodeIds = prevNodeIdsRef.current;
    const newNodeIds = Array.from(currentNodeIds).filter((id) => !previousNodeIds.has(id));

    for (const pinnedId of Array.from(pinnedIdsRef.current)) {
      if (!currentNodeIds.has(pinnedId)) {
        pinnedIdsRef.current.delete(pinnedId);
      }
    }

    const currentConnections = new Map<string, ConnectionSnapshot>();
    for (const connection of currentConnectionsArray) {
      currentConnections.set(connectionKey(connection), {
        sourceId: connection.sourceId,
        targetId: connection.targetId,
        signature: connectionSignature(connection),
      });
    }

    const changedSeedIds = new Set<string>();
    for (const [key, snapshot] of currentConnections.entries()) {
      const previous = prevConnectionsRef.current.get(key);
      if (!previous || previous.signature !== snapshot.signature) {
        changedSeedIds.add(snapshot.sourceId);
        changedSeedIds.add(snapshot.targetId);
        if (previous) {
          changedSeedIds.add(previous.sourceId);
          changedSeedIds.add(previous.targetId);
        }
      }
    }

    for (const [key, previous] of prevConnectionsRef.current.entries()) {
      if (!currentConnections.has(key)) {
        changedSeedIds.add(previous.sourceId);
        changedSeedIds.add(previous.targetId);
      }
    }

    if (newNodeIds.length > 0) {
      for (const nodeId of newNodeIds) {
        const node = currentNodes.find((candidate) => candidate.id === nodeId);
        if (!node || pinnedIdsRef.current.has(nodeId)) continue;
        const baseX = Number.isFinite(node.x) ? node.x : canvasWidth * 0.5;
        const baseY = Number.isFinite(node.y) ? node.y : canvasHeight * 0.5;
        const jitterX = (Math.random() - 0.5) * 60;
        const jitterY = (Math.random() - 0.5) * 60;
        onNodeMoveRef.current(nodeId, baseX + jitterX, baseY + jitterY);
      }
    }

    const sizeChanged =
      prevCanvasSizeRef.current.width !== canvasWidth ||
      prevCanvasSizeRef.current.height !== canvasHeight;
    const repulsionChanged = prevRepulsionRef.current !== repulsionStrength;
    const firstStructuredRun = previousNodeIds.size === 0 && currentNodeIds.size > 0;

    let movableNodeIds = expandWithNeighbors(changedSeedIds, buildAdjacency(currentConnectionsArray));
    movableNodeIds = Array.from(new Set([...movableNodeIds, ...newNodeIds]));

    if (sizeChanged || repulsionChanged) {
      movableNodeIds = currentNodes.map((node) => node.id);
    }

    const shouldRun =
      enabled &&
      !lockPositions &&
      currentNodeIds.size > 1 &&
      (
        firstStructuredRun ||
        newNodeIds.length > 0 ||
        movableNodeIds.length > 0 ||
        sizeChanged ||
        repulsionChanged
      );

    if (shouldRun) {
      scheduleLayout({
        reset: firstStructuredRun,
        newNodeIds,
        movableNodeIds,
      });
    }

    prevNodeIdsRef.current = currentNodeIds;
    prevConnectionsRef.current = currentConnections;
    prevRepulsionRef.current = repulsionStrength;
    prevCanvasSizeRef.current = { width: canvasWidth, height: canvasHeight };
  }, [
    nodeStructureSignature,
    connectionStructureSignature,
    canvasWidth,
    canvasHeight,
    enabled,
    lockPositions,
    repulsionStrength,
    scheduleLayout,
  ]);

  return {
    isComputing,
    setDragging,
    pinNode,
    unpinAll,
    resetLayout,
  };
}
