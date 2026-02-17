import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { GraphCanvas } from '@/components/features/GraphCanvas';
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
import { getAIBenchmarkQuantProfile, getAIQuantProfile } from '@/services/ai/aiClient';

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
  const archiveZoneRef = useRef<HTMLButtonElement>(null);
  const [showDevDashboard, setShowDevDashboard] = useState(
    () => new URLSearchParams(window.location.search).get('dev') === '1',
  );
  const runSessionIdRef = useRef(crypto.randomUUID());

  const createThought = useMutation(api.thoughts.create);
  const addConnectionsMutation = useMutation(api.thoughts.addConnections);
  const updateNodeMutation = useMutation(api.thoughts.updateNode);
  const deleteNodeMutation = useMutation(api.thoughts.deleteNode);
  const createAIRun = useMutation(api.aiRuns.createRun);
  const savedThoughts = useQuery(api.thoughts.list);

  // Refs to access latest state without re-creating graphCallbacks
  const nodesRef = useRef<NodeData[]>(nodes);
  const connectionsRef = useRef<ConnectionData[]>(connections);
  useEffect(() => {
    nodesRef.current = nodes;
  });
  useEffect(() => {
    connectionsRef.current = connections;
  });

  // Dev dashboard hotkey: Ctrl+Shift+D
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

  // Hydrate local state from Convex on initial load
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || savedThoughts === undefined) return;
    hydrated.current = true;

    const allNodes: NodeData[] = [];
    const allConnections: ConnectionData[] = [];
    const seenNodeIds = new Set<string>();

    for (const thought of savedThoughts) {
      const thoughtId = thought._id as string;
      for (const node of thought.nodes as NodeData[]) {
        if (!seenNodeIds.has(node.id)) {
          seenNodeIds.add(node.id);
          allNodes.push({ ...node, thoughtId });
        }
      }
      for (const conn of thought.connections as ConnectionData[]) {
        allConnections.push(conn);
      }
    }

    if (allNodes.length > 0) {
      setNodes(allNodes);
      setConnections(allConnections);
      console.log(`[Convex] Hydrated ${allNodes.length} node(s), ${allConnections.length} connection(s)`);
    }
  }, [savedThoughts]);

  // -- Graph Callbacks for 2-phase AI extraction --
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
    const result = await submit(text, 'apply', getAIQuantProfile());
    if (!result) return;

    // Log the AI run (fire-and-forget)
    logAIRun(createAIRun, {
      dumpText: result.rawText,
      mode: 'apply',
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
    });

    // Persist to Convex
    try {
      const newNodes = nodesRef.current.filter((n) => !n.thoughtId).slice(-result.nodeCount);
      const thoughtId = await createThought({
        text: result.rawText,
        nodes: newNodes,
        connections: [],
        createdAt: Date.now(),
      });
      const thoughtIdStr = thoughtId as string;

      // Tag newly created nodes with thoughtId
      setNodes((prev) =>
        prev.map((n) =>
          !n.thoughtId && newNodes.some((rn) => rn.id === n.id)
            ? { ...n, thoughtId: thoughtIdStr }
            : n,
        ),
      );

      // Persist connections that were added during Phase 2
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

  const handleBenchmark = useCallback(async (text: string, sessionId?: string) => {
    const result = await submit(text, 'benchmark', getAIBenchmarkQuantProfile());
    if (!result) return;

    logAIRun(createAIRun, {
      dumpText: result.rawText,
      mode: 'benchmark',
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
    });
  }, [submit, createAIRun]);

  const handleNodeMove = useCallback((id: string, x: number, y: number) => {
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

  // --- Drag-to-archive ---

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

  // --- View archived node ---

  const handleViewArchivedNode = useCallback((nodeId: string) => {
    setShowArchive(false);
    setTimeout(() => setDetailNodeId(nodeId), 280);
  }, []);

  const activeNodes = nodes.filter((n) => !n.archived);
  const archivedNodes = nodes.filter((n) => n.archived);
  const detailNode = detailNodeId ? nodes.find((n) => n.id === detailNodeId) ?? null : null;

  return (
    <>
      <GraphCanvas
        nodes={activeNodes}
        connections={connections}
        onNodeMove={handleNodeMove}
        onNodeClick={setDetailNodeId}
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
