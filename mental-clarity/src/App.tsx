import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { GraphCanvas } from '@/components/features/GraphCanvas';
import { InputBar } from '@/components/layout/InputBar';
import { NodeDetailPanel } from '@/components/features/GraphCanvas/NodeDetailPanel';
import { ArchivePanel } from '@/components/features/ArchivePanel';
import type { EdgeData } from '@/components/features/GraphCanvas/Node';
import type { ConnectionData, NodeData } from '@/types/graph';
import { useAIExtraction } from '@/hooks/useAIExtraction';

function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const { extract, status, isProcessing } = useAIExtraction();
  const createThought = useMutation(api.thoughts.create);
  const updateNodeMutation = useMutation(api.thoughts.updateNode);
  const deleteNodeMutation = useMutation(api.thoughts.deleteNode);
  const savedThoughts = useQuery(api.thoughts.list);

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
      // Still add nodes locally even if Convex fails
      setNodes((prev) => [...prev, ...result.nodes]);
    }
    setConnections((prev) => [...prev, ...result.connections]);
  }, [extract, createThought]);

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
      />
      <InputBar
        onSubmit={handleSubmit}
        isProcessing={isProcessing}
        aiStatus={status}
      />
      <button
        onClick={() => setShowArchive(true)}
        style={{
          position: 'fixed',
          top: 'var(--space-medium)',
          left: 'var(--space-medium)',
          zIndex: 100,
          border: 'none',
          background: archivedNodes.length > 0 ? 'rgba(212, 168, 127, 0.15)' : 'rgba(0, 0, 0, 0.04)',
          color: archivedNodes.length > 0 ? 'var(--color-warning)' : 'var(--color-text-disabled)',
          fontFamily: 'var(--font-family-primary)',
          fontSize: 'var(--font-size-caption)',
          padding: 'var(--space-tiny) var(--space-small)',
          borderRadius: 'var(--radius-medium)',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        Archive{archivedNodes.length > 0 ? ` (${archivedNodes.length})` : ''}
      </button>
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
          onClose={() => setShowArchive(false)}
        />
      )}
    </>
  );
}

export default App;
