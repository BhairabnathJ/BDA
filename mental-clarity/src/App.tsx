import { useCallback, useState } from 'react';
import { GraphCanvas } from '@/components/features/GraphCanvas';
import { InputBar } from '@/components/layout/InputBar';
import type { NodeData } from '@/components/features/GraphCanvas/Node';

function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);

  const handleAddNode = useCallback((label: string) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const node: NodeData = {
      id: crypto.randomUUID(),
      label,
      x: cx - 300 + Math.random() * 600,
      y: cy - 200 + Math.random() * 400,
      size: 80,
    };
    setNodes((prev) => [...prev, node]);
  }, []);

  const handleNodeMove = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x, y } : n)),
    );
  }, []);

  return (
    <>
      <GraphCanvas nodes={nodes} onNodeMove={handleNodeMove} />
      <InputBar onSubmit={handleAddNode} />
    </>
  );
}

export default App;
