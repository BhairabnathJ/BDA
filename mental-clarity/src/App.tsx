import { useCallback, useState } from 'react';
import { GraphCanvas } from '@/components/features/GraphCanvas';
import { InputBar } from '@/components/layout/InputBar';
import { NodeDetailModal } from '@/components/features/GraphCanvas/NodeDetail';
import type { NodeData } from '@/components/features/GraphCanvas/Node';

function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);

  const handleAddNode = useCallback((label: string) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const now = Date.now();
    const node: NodeData = {
      id: crypto.randomUUID(),
      label,
      x: cx - 300 + Math.random() * 600,
      y: cy - 200 + Math.random() * 400,
      createdAt: now,
      updatedAt: now,
    };
    setNodes((prev) => [...prev, node]);
  }, []);

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
    setDetailNodeId(null);
  }, []);

  const detailNode = detailNodeId ? nodes.find((n) => n.id === detailNodeId) ?? null : null;

  return (
    <>
      <GraphCanvas
        nodes={nodes}
        onNodeMove={handleNodeMove}
        onNodeClick={setDetailNodeId}
      />
      <InputBar onSubmit={handleAddNode} />
      {detailNode && (
        <NodeDetailModal
          node={detailNode}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          onClose={() => setDetailNodeId(null)}
        />
      )}
    </>
  );
}

export default App;
