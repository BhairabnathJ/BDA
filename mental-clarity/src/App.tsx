import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { GraphCanvas } from '@/components/features/GraphCanvas';
import type { GraphCanvasMode, GraphTransitionPhase } from '@/components/features/GraphCanvas';
import { InputBar } from '@/components/layout/InputBar';
import { NodeDetailPanel } from '@/components/features/GraphCanvas/NodeDetailPanel';
import { ArchivePanel } from '@/components/features/ArchivePanel';
import { ArchiveDropZone } from '@/components/features/ArchiveDropZone';
import { AIRunsDashboard } from '@/components/dev/AIRunsDashboard';
import type { EdgeData } from '@/components/features/GraphCanvas/Node';
import type { ConnectionData, NodeData, PageData, DumpData, ExtractedTask, ImmersiveNodeScope } from '@/types/graph';
import { useAIExtraction } from '@/hooks/useAIExtraction';
import type { GraphCallbacks } from '@/hooks/useAIExtraction';
import { logAIRun } from '@/services/analytics/aiRunsClient';

const IMMERSION_ENTER_MS = 560;
const IMMERSION_EXIT_MS = 420;

type GraphScope =
  | { mode: 'main' }
  | { mode: 'immersive'; umbrellaId: string };

type ImmersiveNode = NodeData & { immersiveScope?: ImmersiveNodeScope };

function sanitizeNodeCoordinates(node: NodeData, index: number, total: number): NodeData {
  const width = typeof window === 'undefined' ? 1200 : window.innerWidth;
  const height = typeof window === 'undefined' ? 800 : window.innerHeight;
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const radius = Math.min(Math.max(220, total * 16), 900);
  const fallbackX = width * 0.5 + Math.cos(angle) * radius;
  const fallbackY = height * 0.5 + Math.sin(angle) * radius;

  return {
    ...node,
    x: Number.isFinite(node.x) ? node.x : fallbackX,
    y: Number.isFinite(node.y) ? node.y : fallbackY,
  };
}

function selectMainCanvasNodes(
  activeNodes: NodeData[],
  mentionCountByNodeId: Map<string, number>,
  recentThoughtIds: Set<string>,
): NodeData[] {
  if (activeNodes.length === 0) return [];

  const umbrellas = activeNodes
    .filter((node) => node.kind === 'umbrella')
    .sort((a, b) => {
      const mentionDelta = (mentionCountByNodeId.get(b.id) ?? 0) - (mentionCountByNodeId.get(a.id) ?? 0);
      if (mentionDelta !== 0) return mentionDelta;
      return a.label.localeCompare(b.label);
    });

  const topUmbrellaCount = Math.min(8, Math.max(4, umbrellas.length));
  const topUmbrellas = umbrellas.slice(0, topUmbrellaCount);
  const visibleNodeIds = new Set(topUmbrellas.map((node) => node.id));

  const recentDetailNodes = activeNodes
    .filter(
      (node) => node.kind !== 'umbrella' && node.thoughtId && recentThoughtIds.has(node.thoughtId),
    )
    .sort((a, b) => {
      const mentionDelta = (mentionCountByNodeId.get(b.id) ?? 0) - (mentionCountByNodeId.get(a.id) ?? 0);
      if (mentionDelta !== 0) return mentionDelta;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 32);

  for (const node of recentDetailNodes) {
    visibleNodeIds.add(node.id);
  }

  if (visibleNodeIds.size === 0) {
    return activeNodes.slice(0, Math.min(40, activeNodes.length));
  }

  return activeNodes.filter((node) => visibleNodeIds.has(node.id));
}

function getImmersiveScopeHybrid(
  activeNodes: NodeData[],
  connections: ConnectionData[],
  umbrellaId: string,
): { children: NodeData[]; related: NodeData[] } {
  const children = activeNodes.filter(
    (node) => node.id !== umbrellaId && (node.parentIds ?? []).includes(umbrellaId),
  );
  const childIdSet = new Set(children.map((node) => node.id));

  const relatedIds = new Set<string>();
  for (const connection of connections) {
    if (connection.sourceId === umbrellaId && connection.targetId !== umbrellaId) {
      relatedIds.add(connection.targetId);
    }
    if (connection.targetId === umbrellaId && connection.sourceId !== umbrellaId) {
      relatedIds.add(connection.sourceId);
    }
  }

  const related = activeNodes
    .filter((node) =>
      node.id !== umbrellaId &&
      relatedIds.has(node.id) &&
      !childIdSet.has(node.id),
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  return { children, related };
}

function layoutRing(
  nodes: NodeData[],
  centerX: number,
  centerY: number,
  baseRadius: number,
  minChordLength: number,
  scope: ImmersiveNodeScope,
): ImmersiveNode[] {
  if (nodes.length === 0) return [];

  const perRing = Math.max(6, Math.floor((2 * Math.PI * baseRadius) / minChordLength));
  const result: ImmersiveNode[] = [];
  let index = 0;

  while (index < nodes.length) {
    const ring = Math.floor(index / perRing);
    const ringStart = ring * perRing;
    const ringCount = Math.min(perRing, nodes.length - ringStart);
    const ringRadius = baseRadius + ring * 120;

    const localIndex = index - ringStart;
    const angle = (localIndex / Math.max(ringCount, 1)) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + Math.cos(angle) * ringRadius;
    const y = centerY + Math.sin(angle) * ringRadius;
    const node = nodes[index];
    result.push({
      ...node,
      x,
      y,
      immersiveScope: scope,
    });
    index += 1;
  }

  return result;
}

function buildImmersiveLayout(
  umbrella: NodeData,
  children: NodeData[],
  related: NodeData[],
): ImmersiveNode[] {
  const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const height = typeof window === 'undefined' ? 800 : window.innerHeight;
  const centerX = width * 0.5;
  const centerY = height * 0.5;

  const sortedChildren = [...children].sort((a, b) => b.updatedAt - a.updatedAt || a.label.localeCompare(b.label));
  const sortedRelated = [...related].sort((a, b) => b.updatedAt - a.updatedAt || a.label.localeCompare(b.label));

  const root: ImmersiveNode = {
    ...umbrella,
    x: centerX,
    y: centerY,
  };

  const childRing = layoutRing(sortedChildren, centerX, centerY, 220, 130, 'child');
  const relatedRing = layoutRing(sortedRelated, centerX, centerY, 390, 140, 'related');

  return [root, ...childRing, ...relatedRing];
}

function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [, setDumps] = useState<DumpData[]>([]);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverArchive, setIsOverArchive] = useState(false);
  const [graphScope, setGraphScope] = useState<GraphScope>({ mode: 'main' });
  const [transitionPhase, setTransitionPhase] = useState<GraphTransitionPhase>('idle');
  const [transitionOrigin, setTransitionOrigin] = useState({ x: 0.5, y: 0.5 });
  const archiveZoneRef = useRef<HTMLButtonElement>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDevDashboard, setShowDevDashboard] = useState(
    () => new URLSearchParams(window.location.search).get('dev') === '1',
  );

  const createThought = useMutation(api.thoughts.create);
  const addConnectionsMutation = useMutation(api.thoughts.addConnections);
  const updateNodeMutation = useMutation(api.thoughts.updateNode);
  const deleteNodeMutation = useMutation(api.thoughts.deleteNode);
  const createAIRun = useMutation(api.aiRuns.createRun);
  const savedThoughts = useQuery(api.thoughts.list);

  const nodesRef = useRef<NodeData[]>(nodes);
  const connectionsRef = useRef<ConnectionData[]>(connections);
  useEffect(() => {
    nodesRef.current = nodes;
  });
  useEffect(() => {
    connectionsRef.current = connections;
  });

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDevDashboard((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || savedThoughts === undefined) return;
    hydrated.current = true;

    const rawNodes: NodeData[] = [];
    const allConnections: ConnectionData[] = [];
    const seenNodeIds = new Set<string>();

    for (const thought of savedThoughts) {
      const thoughtId = thought._id as string;
      for (const node of thought.nodes as NodeData[]) {
        if (!seenNodeIds.has(node.id)) {
          seenNodeIds.add(node.id);
          rawNodes.push({ ...node, thoughtId });
        }
      }
      for (const conn of thought.connections as ConnectionData[]) {
        allConnections.push(conn);
      }
    }

    if (rawNodes.length > 0) {
      const allNodes = rawNodes.map((node, index, arr) => sanitizeNodeCoordinates(node, index, arr.length));
      setNodes(allNodes);
      setConnections(allConnections);
      console.log(`[Convex] Hydrated ${allNodes.length} node(s), ${allConnections.length} connection(s)`);
    }
  }, [savedThoughts]);

  const graphCallbacks: GraphCallbacks = useMemo(() => ({
    addNodes: (newNodes: NodeData[]) =>
      setNodes((prev) => [...prev, ...newNodes]),
    updateNodes: (updates: Map<string, Partial<NodeData>>) =>
      setNodes((prev) =>
        prev.map((n) => {
          const u = updates.get(n.id);
          return u ? { ...n, ...u, updatedAt: Date.now() } : n;
        }),
      ),
    mergeNodes: (merges: Map<string, string>) =>
      setNodes((prev) => prev.filter((n) => !merges.has(n.id))),
    addConnections: (newConns: ConnectionData[]) =>
      setConnections((prev) => [...prev, ...newConns]),
    addPages: (newPages: PageData[]) =>
      setPages((prev) => [...prev, ...newPages]),
    addTasks: (newTasks: ExtractedTask[]) =>
      setTasks((prev) => [...prev, ...newTasks]),
    addDump: (dump: DumpData) =>
      setDumps((prev) => [...prev, dump]),
    getExistingNodes: () => nodesRef.current,
  }), []);

  const { submit, status, isProcessing, streamProgress } = useAIExtraction(graphCallbacks);

  const handleSubmit = useCallback(async (text: string) => {
    const connectionsBefore = connectionsRef.current.length;
    const result = await submit(text);
    if (!result) return;

    logAIRun(createAIRun, {
      dumpText: result.rawText,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      nodeCount: result.nodeCount,
      connectionCount: result.connectionCount,
      aiStatus: result.aiStatus,
      errorMessage: result.errorMessage,
      meta: result.meta,
    });

    try {
      const newNodes = nodesRef.current.filter((n) => !n.thoughtId).slice(-result.nodeCount);
      const thoughtId = await createThought({
        text: result.rawText,
        nodes: newNodes,
        connections: [],
        createdAt: Date.now(),
      });
      const thoughtIdStr = thoughtId as string;

      setNodes((prev) =>
        prev.map((n) =>
          !n.thoughtId && newNodes.some((rn) => rn.id === n.id)
            ? { ...n, thoughtId: thoughtIdStr }
            : n,
        ),
      );

      const newConnections = connectionsRef.current.slice(connectionsBefore);
      if (newConnections.length > 0) {
        addConnectionsMutation({
          thoughtId: thoughtId as never,
          connections: newConnections,
        }).catch((err) => console.error('[Convex] Failed to save connections:', err));
      }
    } catch (err) {
      console.error('[Convex] Failed to save thought:', err);
    }
  }, [submit, createThought, addConnectionsMutation, createAIRun]);

  const handleNodeMove = useCallback((id: string, x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x, y } : n)),
    );
  }, []);

  const handleUpdateNode = useCallback((id: string, updates: Partial<Pick<NodeData, 'label' | 'content'>>) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n,
      ),
    );
  }, []);

  const markNodeAccess = useCallback((id: string) => {
    const now = Date.now();
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node) return;

    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lastAccessedAt: now } : n)),
    );

    if (node.thoughtId) {
      updateNodeMutation({
        thoughtId: node.thoughtId as never,
        nodeId: id,
        updates: { lastAccessedAt: now },
      }).catch((err) => console.error('[Convex] Failed to update node access time:', err));
    }
  }, [updateNodeMutation]);

  const handleArchiveNode = useCallback((id: string) => {
    const node = nodesRef.current.find((n) => n.id === id);
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, archived: true, updatedAt: Date.now() } : n)),
    );
    setDetailNodeId(null);

    if (node?.thoughtId) {
      updateNodeMutation({
        thoughtId: node.thoughtId as never,
        nodeId: id,
        updates: { archived: true, updatedAt: Date.now() },
      }).catch((err) => console.error('[Convex] Failed to archive node:', err));
    }
  }, [updateNodeMutation]);

  const handleRestoreNode = useCallback((id: string) => {
    const node = nodesRef.current.find((n) => n.id === id);
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, archived: false, updatedAt: Date.now() } : n)),
    );

    if (node?.thoughtId) {
      updateNodeMutation({
        thoughtId: node.thoughtId as never,
        nodeId: id,
        updates: { archived: false, updatedAt: Date.now() },
      }).catch((err) => console.error('[Convex] Failed to restore node:', err));
    }
  }, [updateNodeMutation]);

  const handleDeleteNode = useCallback((id: string) => {
    const node = nodesRef.current.find((n) => n.id === id);
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter(
      (c) => c.sourceId !== id && c.targetId !== id,
    ));
    setEdges((prev) => prev.filter((e) => e.sourceId !== id && e.targetId !== id));
    setPages((prev) => {
      const nodeObj = nodesRef.current.find((n) => n.id === id);
      if (nodeObj?.pageId) return prev.filter((p) => p.id !== nodeObj.pageId);
      return prev;
    });
    setDetailNodeId(null);

    if (node?.thoughtId) {
      deleteNodeMutation({
        thoughtId: node.thoughtId as never,
        nodeId: id,
      }).catch((err) => console.error('[Convex] Failed to delete node:', err));
    }
  }, [deleteNodeMutation]);

  const handleAddEdge = useCallback((sourceId: string, targetId: string) => {
    setEdges((prev) => {
      const exists = prev.some(
        (e) =>
          (e.sourceId === sourceId && e.targetId === targetId) ||
          (e.sourceId === targetId && e.targetId === sourceId),
      );
      if (exists) return prev;
      return [
        ...prev,
        { id: crypto.randomUUID(), sourceId, targetId, strength: 3 },
      ];
    });
  }, []);

  const handleRemoveEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  const handleNavigateNode = useCallback((nodeId: string) => {
    markNodeAccess(nodeId);
    setDetailNodeId(nodeId);
  }, [markNodeAccess]);

  const handleUpdatePage = useCallback((pageId: string, updates: Partial<PageData>) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, ...updates } : p)),
    );
  }, []);

  const handleNodeDragMove = useCallback((_nodeId: string, screenX: number, screenY: number) => {
    setIsDragging(true);
    const el = archiveZoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 32;
    const over =
      screenX >= rect.left - pad &&
      screenX <= rect.right + pad &&
      screenY >= rect.top - pad &&
      screenY <= rect.bottom + pad;
    setIsOverArchive(over);
  }, []);

  const handleNodeDrop = useCallback((nodeId: string, screenX: number, screenY: number) => {
    setIsDragging(false);
    setIsOverArchive(false);
    const el = archiveZoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 32;
    const over =
      screenX >= rect.left - pad &&
      screenX <= rect.right + pad &&
      screenY >= rect.top - pad &&
      screenY <= rect.bottom + pad;
    if (over) {
      handleArchiveNode(nodeId);
    }
  }, [handleArchiveNode]);

  const handleViewArchivedNode = useCallback((nodeId: string) => {
    setShowArchive(false);
    setTimeout(() => setDetailNodeId(nodeId), 280);
  }, []);

  const activeNodes = useMemo(() => nodes.filter((n) => !n.archived), [nodes]);
  const archivedNodes = useMemo(() => nodes.filter((n) => n.archived), [nodes]);
  const mentionCountByNodeId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const thought of savedThoughts ?? []) {
      const seenInThought = new Set<string>();
      for (const node of thought.nodes as NodeData[]) {
        if (seenInThought.has(node.id)) continue;
        seenInThought.add(node.id);
        counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [savedThoughts]);
  const activeNodesWithStats = useMemo(
    () =>
      activeNodes.map((node) => ({
        ...node,
        mentionCount: mentionCountByNodeId.get(node.id) ?? 0,
      })),
    [activeNodes, mentionCountByNodeId],
  );
  const recentThoughtIds = useMemo(() => {
    const thoughts = savedThoughts ?? [];
    return new Set(
      [...thoughts]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3)
        .map((thought) => thought._id as string),
    );
  }, [savedThoughts]);

  const mainNodes = useMemo(
    () => selectMainCanvasNodes(activeNodesWithStats, mentionCountByNodeId, recentThoughtIds),
    [activeNodesWithStats, mentionCountByNodeId, recentThoughtIds],
  );
  const mainNodeIdSet = useMemo(
    () => new Set(mainNodes.map((node) => node.id)),
    [mainNodes],
  );
  const mainConnections = useMemo(
    () => connections.filter((conn) => mainNodeIdSet.has(conn.sourceId) && mainNodeIdSet.has(conn.targetId)),
    [connections, mainNodeIdSet],
  );

  const immersiveUmbrella = useMemo(() => {
    if (graphScope.mode !== 'immersive') return null;
    return activeNodesWithStats.find((n) => n.id === graphScope.umbrellaId) ?? null;
  }, [activeNodesWithStats, graphScope]);

  const immersiveNodes = useMemo(() => {
    if (graphScope.mode !== 'immersive' || !immersiveUmbrella) return [];
    const { children, related } = getImmersiveScopeHybrid(activeNodesWithStats, connections, graphScope.umbrellaId);
    return buildImmersiveLayout(immersiveUmbrella, children, related);
  }, [activeNodesWithStats, connections, graphScope, immersiveUmbrella]);

  const immersiveNodeIdSet = useMemo(
    () => new Set(immersiveNodes.map((node) => node.id)),
    [immersiveNodes],
  );

  const immersiveConnections = useMemo(
    () => connections.filter((conn) => immersiveNodeIdSet.has(conn.sourceId) && immersiveNodeIdSet.has(conn.targetId)),
    [connections, immersiveNodeIdSet],
  );

  const graphMode: GraphCanvasMode = graphScope.mode;
  const canvasNodes = graphMode === 'main' ? mainNodes : immersiveNodes;
  const canvasConnections = graphMode === 'main' ? mainConnections : immersiveConnections;

  useEffect(() => {
    if (graphScope.mode !== 'immersive') return;
    if (immersiveUmbrella) return;
    setGraphScope({ mode: 'main' });
    setTransitionPhase('idle');
  }, [graphScope.mode, immersiveUmbrella]);

  const setTransitionTimer = useCallback((cb: () => void, delay: number) => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = null;
      cb();
    }, delay);
  }, []);

  const handleEnterUmbrella = useCallback((umbrellaId: string, origin: { x: number; y: number }) => {
    setDetailNodeId(null);
    setTransitionOrigin(origin);
    setTransitionPhase('entering');
    setTransitionTimer(() => {
      setGraphScope({ mode: 'immersive', umbrellaId });
      setTransitionPhase('idle');
    }, IMMERSION_ENTER_MS);
  }, [setTransitionTimer]);

  const handleExitImmersive = useCallback(() => {
    if (graphScope.mode !== 'immersive') return;
    setDetailNodeId(null);
    setTransitionPhase('exiting');
    setTransitionTimer(() => {
      setGraphScope({ mode: 'main' });
      setTransitionPhase('idle');
    }, IMMERSION_EXIT_MS);
  }, [graphScope.mode, setTransitionTimer]);

  const handleGraphSingleClick = useCallback((nodeId: string, _mode: GraphCanvasMode) => {
    markNodeAccess(nodeId);
    setDetailNodeId(nodeId);
  }, [markNodeAccess]);

  const handleGraphDoubleClick = useCallback((nodeId: string, mode: GraphCanvasMode, origin: { x: number; y: number }) => {
    if (mode === 'main') {
      const clickedNode = activeNodesWithStats.find((node) => node.id === nodeId);
      if (!clickedNode || clickedNode.kind !== 'umbrella') {
        setDetailNodeId(nodeId);
        return;
      }

      const scoped = getImmersiveScopeHybrid(activeNodesWithStats, connections, nodeId);
      if (scoped.children.length === 0 && scoped.related.length === 0) {
        setDetailNodeId(nodeId);
        return;
      }

      handleEnterUmbrella(nodeId, origin);
      return;
    }

    setDetailNodeId(nodeId);
  }, [activeNodesWithStats, connections, handleEnterUmbrella]);

  const handleCanvasNodeMove = useCallback((id: string, x: number, y: number) => {
    if (graphMode === 'immersive') return;
    handleNodeMove(id, x, y);
  }, [graphMode, handleNodeMove]);

  const detailNode = detailNodeId ? nodes.find((n) => n.id === detailNodeId) ?? null : null;
  const detailMentionCount = detailNode ? mentionCountByNodeId.get(detailNode.id) ?? 0 : 0;

  return (
    <>
      <GraphCanvas
        mode={graphMode}
        immersiveLabel={immersiveUmbrella ? `All nodes > ${immersiveUmbrella.label}` : undefined}
        transitionPhase={transitionPhase}
        transitionOrigin={transitionOrigin}
        nodes={canvasNodes}
        connections={canvasConnections}
        onNodeMove={handleCanvasNodeMove}
        layoutEnabled={graphMode === 'main'}
        onNodeSingleClick={handleGraphSingleClick}
        onNodeDoubleClick={handleGraphDoubleClick}
        onBackFromImmersive={graphMode === 'immersive' ? handleExitImmersive : undefined}
        onNodeDragMove={handleNodeDragMove}
        onNodeDrop={handleNodeDrop}
      />
      <InputBar
        onSubmit={handleSubmit}
        isProcessing={isProcessing}
        aiStatus={status}
        streamProgress={streamProgress}
      />
      <ArchiveDropZone
        ref={archiveZoneRef}
        archivedCount={archivedNodes.length}
        isDragActive={isDragging}
        isDragOver={isOverArchive}
        onClick={() => setShowArchive(true)}
      />
      {detailNode && (
        <NodeDetailPanel
          key={detailNode.id}
          node={detailNode}
          nodes={activeNodesWithStats}
          edges={edges}
          connections={connections}
          pages={pages}
          tasks={tasks}
          mentionCount={detailMentionCount}
          onUpdate={handleUpdateNode}
          onArchive={handleArchiveNode}
          onAddEdge={handleAddEdge}
          onRemoveEdge={handleRemoveEdge}
          onNavigate={handleNavigateNode}
          onUpdatePage={handleUpdatePage}
          onClose={() => setDetailNodeId(null)}
        />
      )}
      {showArchive && (
        <ArchivePanel
          nodes={archivedNodes}
          onRestore={handleRestoreNode}
          onDelete={handleDeleteNode}
          onView={handleViewArchivedNode}
          onClose={() => setShowArchive(false)}
        />
      )}
      {showDevDashboard && (
        <AIRunsDashboard onClose={() => setShowDevDashboard(false)} />
      )}
    </>
  );
}

export default App;
