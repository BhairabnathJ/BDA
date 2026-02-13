import { useCallback, useState } from 'react';
import { GraphCanvas } from '@/components/features/GraphCanvas';
import { InputBar } from '@/components/layout/InputBar';
import { NodeDetailPanel } from '@/components/features/GraphCanvas/NodeDetailPanel';
import type { EdgeData } from '@/components/features/GraphCanvas/Node';
import type { ConnectionData, NodeData } from '@/types/graph';
import { useAIExtraction } from '@/hooks/useAIExtraction';

function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const { extract, status, isProcessing } = useAIExtraction();

  const handleSubmit = useCallback(async (text: string) => {
    const result = await extract(text);
    if (!result) return;
    setNodes((prev) => [...prev, ...result.nodes]);
    setConnections((prev) => [...prev, ...result.connections]);
  }, [extract]);

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

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter(
      (c) => c.sourceId !== id && c.targetId !== id,
    ));
    setEdges((prev) => prev.filter((e) => e.sourceId !== id && e.targetId !== id));
    setDetailNodeId(null);
  }, []);

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

  const detailNode = detailNodeId ? nodes.find((n) => n.id === detailNodeId) ?? null : null;

  return (
    <>
      <GraphCanvas
        nodes={nodes}
        connections={connections}
        onNodeMove={handleNodeMove}
        onNodeClick={setDetailNodeId}
      />
      <InputBar
        onSubmit={handleSubmit}
        isProcessing={isProcessing}
        aiStatus={status}
      />
      {detailNode && (
        <NodeDetailPanel
          key={detailNode.id}
          node={detailNode}
          nodes={nodes}
          edges={edges}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          onAddEdge={handleAddEdge}
          onRemoveEdge={handleRemoveEdge}
          onNavigate={handleNavigateNode}
          onClose={() => setDetailNodeId(null)}
        />
      )}
    </>
  );
}

export default App;
