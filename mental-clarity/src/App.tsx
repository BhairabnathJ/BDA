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
import type { ConnectionData, NodeData, PageData, DumpData, ExtractedTask } from '@/types/graph';
import { useAIExtraction } from '@/hooks/useAIExtraction';
import type { GraphCallbacks } from '@/hooks/useAIExtraction';
import { logAIRun } from '@/services/analytics/aiRunsClient';
import { hashInput } from '@/services/analytics/runHash';
import { getAIBenchmarkQuantProfile, getAIQuantProfile } from '@/services/ai/aiClient';

const IMMERSION_ENTER_MS = 560;
const IMMERSION_EXIT_MS = 420;

interface ActivePromptProfile {
  profileId: string;
  version: string;
  templates?: {
    promptA?: string;
    promptB?: string;
    promptC?: string;
    promptD?: string;
    promptE?: string;
  };
}

type GraphScope =
  | { mode: 'main' }
  | { mode: 'immersive'; umbrellaId: string };

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

function inferLegacyUmbrellas(activeNodes: NodeData[], connections: ConnectionData[]): NodeData[] {
  if (activeNodes.length === 0) return [];

  const degreeByNodeId = new Map<string, number>();
  for (const node of activeNodes) {
    degreeByNodeId.set(node.id, 0);
  }

  for (const connection of connections) {
    if (degreeByNodeId.has(connection.sourceId)) {
      degreeByNodeId.set(connection.sourceId, (degreeByNodeId.get(connection.sourceId) ?? 0) + 1);
    }
    if (degreeByNodeId.has(connection.targetId)) {
      degreeByNodeId.set(connection.targetId, (degreeByNodeId.get(connection.targetId) ?? 0) + 1);
    }
  }

  const rootLikeNodes = activeNodes.filter((node) => (node.parentIds?.length ?? 0) === 0);
  const candidatePool = rootLikeNodes.length > 0 ? rootLikeNodes : activeNodes;

  const targetCount = Math.min(
    12,
    Math.max(4, Math.round(Math.sqrt(candidatePool.length || 1))),
  );

  return [...candidatePool]
    .sort((a, b) => {
      const degreeDelta = (degreeByNodeId.get(b.id) ?? 0) - (degreeByNodeId.get(a.id) ?? 0);
      if (degreeDelta !== 0) return degreeDelta;
      return a.label.localeCompare(b.label);
    })
    .slice(0, targetCount);
}

function getMainCanvasNodes(activeNodes: NodeData[], connections: ConnectionData[]): NodeData[] {
  const parentCandidateIds = new Set<string>();
  for (const node of activeNodes) {
    for (const parentId of node.parentIds ?? []) {
      parentCandidateIds.add(parentId);
    }
  }

  const explicitUmbrellas = activeNodes.filter((node) => node.kind === 'umbrella');
  const implicitRootParents = activeNodes.filter(
    (node) =>
      parentCandidateIds.has(node.id) &&
      (node.parentIds?.length ?? 0) === 0 &&
      node.kind !== 'umbrella',
  );

  const umbrellaNodes = [...explicitUmbrellas, ...implicitRootParents];
  if (umbrellaNodes.length > 0) return umbrellaNodes;

  // Legacy fallback: infer a compact umbrella view from top connected roots.
  return inferLegacyUmbrellas(activeNodes, connections);
}

function getImmersiveNodes(
  activeNodes: NodeData[],
  connections: ConnectionData[],
  umbrellaId: string,
): NodeData[] {
  const directChildren = activeNodes.filter(
    (node) => node.id !== umbrellaId && (node.parentIds ?? []).includes(umbrellaId),
  );

  if (directChildren.length > 0) return directChildren;

  // Fallback for legacy data where parentIds were never assigned.
  const connectedIds = new Set<string>();
  for (const connection of connections) {
    if (connection.sourceId === umbrellaId) connectedIds.add(connection.targetId);
    if (connection.targetId === umbrellaId) connectedIds.add(connection.sourceId);
  }

  return activeNodes.filter(
    (node) => connectedIds.has(node.id) && node.id !== umbrellaId && node.kind !== 'umbrella',
  );
}

function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  // Dumps track raw brain dump text history for context in future extractions
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
  const runSessionIdRef = useRef(crypto.randomUUID());

  const createThought = useMutation(api.thoughts.create);
  const addConnectionsMutation = useMutation(api.thoughts.addConnections);
  const updateNodeMutation = useMutation(api.thoughts.updateNode);
  const deleteNodeMutation = useMutation(api.thoughts.deleteNode);
  const createAIRun = useMutation(api.aiRuns.createRun);
  const anyApi = api as any;
  const ensureDefaultPromptProfile = useMutation(anyApi.promptProfiles.ensureDefaultProfile as any) as (args: Record<string, never>) => Promise<unknown>;
  const activePromptProfile = useQuery(anyApi.promptProfiles.getActiveProfile as any, {}) as ActivePromptProfile | null | undefined;
  const savedThoughts = useQuery(api.thoughts.list);

  useEffect(() => {
    if (activePromptProfile !== null) return;
    ensureDefaultPromptProfile({}).catch((err: unknown) => {
      console.error('[PromptProfiles] Failed to ensure default profile:', err);
    });
  }, [activePromptProfile, ensureDefaultPromptProfile]);

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
      let sanitizedCount = 0;
      const allNodes = rawNodes.map((node, index, arr) => {
        const sanitized = sanitizeNodeCoordinates(node, index, arr.length);
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) sanitizedCount += 1;
        return sanitized;
      });

      setNodes(allNodes);
      setConnections(allConnections);
      console.log(`[Convex] Hydrated ${allNodes.length} node(s), ${allConnections.length} connection(s)`);
      if (sanitizedCount > 0) {
        console.warn(`[Convex] Sanitized ${sanitizedCount} node coordinate(s) with invalid x/y values`);
      }
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
    const result = await submit(text, 'apply', getAIQuantProfile(), activePromptProfile?.templates);
    if (!result) return;
    const activeProfileId = activePromptProfile ? `${activePromptProfile.profileId}@${activePromptProfile.version}` : undefined;
    const inputHash = hashInput(result.rawText);

    const runId = await logAIRun(createAIRun, {
      dumpText: result.rawText,
      mode: 'apply',
      promptProfileId: activeProfileId,
      inputHash,
      sessionId: runSessionIdRef.current,
      backend: result.backendUsed,
      model: result.modelUsed,
      quant: result.quantUsed,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      nodeCount: result.nodeCount,
      connectionCount: result.connectionCount,
      aiStatus: result.aiStatus,
      errorMessage: result.errorMessage,
      artifacts: result.artifacts,
      meta: result.meta,
      quality: {
        score: undefined,
        note: undefined,
      },
    });

    try {
      const newNodes = nodesRef.current.filter((n) => !n.thoughtId).slice(-result.nodeCount);
      const thoughtId = await createThought({
        text: result.rawText,
        nodes: newNodes,
        connections: [],
        runId: runId as never,
        inputHash,
        sessionId: runSessionIdRef.current,
        mode: 'apply',
        backend: result.backendUsed,
        quant: result.quantUsed,
        promptProfileId: activeProfileId,
        quality: {
          score: undefined,
          note: undefined,
        },
        connectionReviews: [],
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
  }, [submit, activePromptProfile, createThought, addConnectionsMutation, createAIRun]);

  const handleBenchmark = useCallback(async (text: string, sessionId?: string) => {
    const result = await submit(text, 'benchmark', getAIBenchmarkQuantProfile(), activePromptProfile?.templates);
    if (!result) return;
    const activeProfileId = activePromptProfile ? `${activePromptProfile.profileId}@${activePromptProfile.version}` : undefined;
    const inputHash = hashInput(result.rawText);

    await logAIRun(createAIRun, {
      dumpText: result.rawText,
      mode: 'benchmark',
      promptProfileId: activeProfileId,
      inputHash,
      sessionId: sessionId ?? runSessionIdRef.current,
      backend: result.backendUsed,
      model: result.modelUsed,
      quant: result.quantUsed,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      nodeCount: result.nodeCount,
      connectionCount: result.connectionCount,
      aiStatus: result.aiStatus,
      errorMessage: result.errorMessage,
      artifacts: result.artifacts,
      meta: result.meta,
      quality: {
        score: undefined,
        note: undefined,
      },
    });
  }, [submit, activePromptProfile, createAIRun]);

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
    setDetailNodeId(nodeId);
  }, []);

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

  const activeNodes = useMemo(
    () => nodes.filter((n) => !n.archived),
    [nodes],
  );
  const archivedNodes = useMemo(
    () => nodes.filter((n) => n.archived),
    [nodes],
  );

  const mainNodes = useMemo(
    () => getMainCanvasNodes(activeNodes, connections),
    [activeNodes, connections],
  );

  const mainNodeIdSet = useMemo(
    () => new Set(mainNodes.map((n) => n.id)),
    [mainNodes],
  );

  const mainConnections = useMemo(
    () => connections.filter((c) => mainNodeIdSet.has(c.sourceId) && mainNodeIdSet.has(c.targetId)),
    [connections, mainNodeIdSet],
  );

  const immersiveUmbrella = useMemo(() => {
    if (graphScope.mode !== 'immersive') return null;
    return activeNodes.find((n) => n.id === graphScope.umbrellaId) ?? null;
  }, [activeNodes, graphScope]);

  const immersiveNodes = useMemo(() => {
    if (graphScope.mode !== 'immersive') return [];
    return getImmersiveNodes(activeNodes, connections, graphScope.umbrellaId);
  }, [activeNodes, connections, graphScope]);

  const immersiveNodeIdSet = useMemo(
    () => new Set(immersiveNodes.map((n) => n.id)),
    [immersiveNodes],
  );

  const immersiveConnections = useMemo(
    () => connections.filter((c) => immersiveNodeIdSet.has(c.sourceId) && immersiveNodeIdSet.has(c.targetId)),
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

  const handleGraphSingleClick = useCallback((nodeId: string, mode: GraphCanvasMode) => {
    if (mode === 'main' || mode === 'immersive') {
      setDetailNodeId(nodeId);
    }
  }, []);

  const handleGraphDoubleClick = useCallback((nodeId: string, mode: GraphCanvasMode, origin: { x: number; y: number }) => {
    if (mode === 'main') {
      const immersiveCandidates = getImmersiveNodes(activeNodes, connections, nodeId);
      if (immersiveCandidates.length === 0) {
        setDetailNodeId(nodeId);
        return;
      }
      handleEnterUmbrella(nodeId, origin);
      return;
    }

    setDetailNodeId(nodeId);
  }, [activeNodes, connections, handleEnterUmbrella]);

  const detailNode = detailNodeId ? nodes.find((n) => n.id === detailNodeId) ?? null : null;

  return (
    <>
      <GraphCanvas
        mode={graphMode}
        immersiveLabel={immersiveUmbrella?.label}
        transitionPhase={transitionPhase}
        transitionOrigin={transitionOrigin}
        nodes={canvasNodes}
        connections={canvasConnections}
        onNodeMove={handleNodeMove}
        onNodeSingleClick={handleGraphSingleClick}
        onNodeDoubleClick={handleGraphDoubleClick}
        onBackFromImmersive={graphMode === 'immersive' ? handleExitImmersive : undefined}
        onNodeDragMove={handleNodeDragMove}
        onNodeDrop={handleNodeDrop}
      />
      <InputBar
        onSubmit={handleSubmit}
        onBenchmark={handleBenchmark}
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
          nodes={activeNodes}
          edges={edges}
          connections={connections}
          pages={pages}
          tasks={tasks}
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
        <AIRunsDashboard
          onClose={() => setShowDevDashboard(false)}
          onRerunBenchmark={handleBenchmark}
        />
      )}
    </>
  );
}

export default App;
