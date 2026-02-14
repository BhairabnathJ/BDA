import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { GraphCanvas } from '@/components/features/GraphCanvas';
import { InputBar } from '@/components/layout/InputBar';
import { NodeDetailPanel } from '@/components/features/GraphCanvas/NodeDetailPanel';
import { ArchivePanel } from '@/components/features/ArchivePanel';
import { ArchiveDropZone } from '@/components/features/ArchiveDropZone';
import { AIRunsDashboard } from '@/components/dev/AIRunsDashboard';
import type { EdgeData } from '@/components/features/GraphCanvas/Node';
import type { ConnectionData, NodeData } from '@/types/graph';
import { useAIExtraction } from '@/hooks/useAIExtraction';
import { logAIRun } from '@/services/analytics/aiRunsClient';

function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverArchive, setIsOverArchive] = useState(false);
  const archiveZoneRef = useRef<HTMLButtonElement>(null);
  const [showDevDashboard, setShowDevDashboard] = useState(
    () => new URLSearchParams(window.location.search).get('dev') === '1',
  );
  const { extract, status, isProcessing } = useAIExtraction();
  const createThought = useMutation(api.thoughts.create);
  const updateNodeMutation = useMutation(api.thoughts.updateNode);
  const deleteNodeMutation = useMutation(api.thoughts.deleteNode);
  const createAIRun = useMutation(api.aiRuns.createRun);
  const savedThoughts = useQuery(api.thoughts.list);

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

  const handleSubmit = useCallback(async (text: string) => {
    const result = await extract(text);
    if (!result) return;

    // Log the AI run (fire-and-forget)
    logAIRun(createAIRun, {
      dumpText: result.rawText,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      nodeCount: result.nodes.length,
      connectionCount: result.connections.length,
      aiStatus: result.aiStatus,
      errorMessage: result.errorMessage,
      meta: result.meta,
    });

    // Persist to Convex first to get the document ID
    try {
      const thoughtId = await createThought({
        text: result.rawText,
        nodes: result.nodes,
        connections: result.connections,
        createdAt: Date.now(),
      });
      const nodesWithThoughtId = result.nodes.map((n) => ({ ...n, thoughtId: thoughtId as string }));
      setNodes((prev) => [...prev, ...nodesWithThoughtId]);
    } catch (err) {
      console.error('[Convex] Failed to save thought:', err);
      setNodes((prev) => [...prev, ...result.nodes]);
    }
    setConnections((prev) => [...prev, ...result.connections]);
  }, [extract, createThought, createAIRun]);

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
    const node = nodes.find((n) => n.id === id);
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
  }, [nodes, updateNodeMutation]);

  const handleRestoreNode = useCallback((id: string) => {
    const node = nodes.find((n) => n.id === id);
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
  }, [nodes, updateNodeMutation]);

  const handleDeleteNode = useCallback((id: string) => {
    const node = nodes.find((n) => n.id === id);
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter(
      (c) => c.sourceId !== id && c.targetId !== id,
    ));
    setEdges((prev) => prev.filter((e) => e.sourceId !== id && e.targetId !== id));
    setDetailNodeId(null);

    if (node?.thoughtId) {
      deleteNodeMutation({
        thoughtId: node.thoughtId as never,
        nodeId: id,
      }).catch((err) => console.error('[Convex] Failed to delete node:', err));
    }
  }, [nodes, deleteNodeMutation]);

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

  // --- Drag-to-archive ---

  const handleNodeDragMove = useCallback((_nodeId: string, screenX: number, screenY: number) => {
    setIsDragging(true);
    const el = archiveZoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Generous hit area (32px padding around the button)
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
    // Small delay so archive panel closes before detail opens
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
        isProcessing={isProcessing}
        aiStatus={status}
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
          onUpdate={handleUpdateNode}
          onArchive={handleArchiveNode}
          onAddEdge={handleAddEdge}
          onRemoveEdge={handleRemoveEdge}
          onNavigate={handleNavigateNode}
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
