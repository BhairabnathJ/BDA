import { useCallback, useEffect, useRef } from 'react';
import type { NodeData, ConnectionData } from '@/types/graph';

interface ForceLayoutConfig {
  repulsion: number;
  attraction: number;
  parentAttraction: number;
  damping: number;
  minVelocity: number;
  centerGravity: number;
}

const DEFAULT_CONFIG: ForceLayoutConfig = {
  repulsion: 5000,
  attraction: 0.01,
  parentAttraction: 0.015,
  damping: 0.82,
  minVelocity: 0.15,
  centerGravity: 0.0005,
};

interface NodeVelocity {
  vx: number;
  vy: number;
}

export function useForceLayout(
  nodes: NodeData[],
  connections: ConnectionData[],
  onNodeMove: (id: string, x: number, y: number) => void,
  enabled = true,
) {
  // Store everything in refs so tick() always reads fresh data
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const onNodeMoveRef = useRef(onNodeMove);

  const velocities = useRef<Map<string, NodeVelocity>>(new Map());
  const rafId = useRef<number>(0);
  const draggingId = useRef<string | null>(null);
  const isRunning = useRef(false);
  const tickCount = useRef(0);

  // Keep refs in sync with latest props
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { onNodeMoveRef.current = onNodeMove; }, [onNodeMove]);

  const setDragging = useCallback((nodeId: string | null) => {
    draggingId.current = nodeId;
  }, []);

  useEffect(() => {
    if (!enabled || nodes.length < 2) {
      isRunning.current = false;
      return;
    }

    // Initialize velocities for new nodes
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const node of nodes) {
      if (!velocities.current.has(node.id)) {
        velocities.current.set(node.id, { vx: 0, vy: 0 });
      }
    }
    for (const key of velocities.current.keys()) {
      if (!nodeIds.has(key)) velocities.current.delete(key);
    }

    // Don't restart if already running
    if (isRunning.current) return;
    isRunning.current = true;
    tickCount.current = 0;

    const cfg = DEFAULT_CONFIG;
    const maxTicks = 300;

    const tick = () => {
      tickCount.current++;
      if (tickCount.current > maxTicks) {
        isRunning.current = false;
        return;
      }

      // Read fresh data from refs every tick
      const currentNodes = nodesRef.current;
      const currentConnections = connectionsRef.current;

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      const forces = new Map<string, { fx: number; fy: number }>();
      for (const node of currentNodes) {
        forces.set(node.id, { fx: 0, fy: 0 });
      }

      // Repulsion between all node pairs
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const a = currentNodes[i];
          const b = currentNodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) || 1;

          const force = cfg.repulsion / (distSq || 1);
          dx = (dx / dist) * force;
          dy = (dy / dist) * force;

          const fa = forces.get(a.id)!;
          const fb = forces.get(b.id)!;
          fa.fx -= dx;
          fa.fy -= dy;
          fb.fx += dx;
          fb.fy += dy;
        }
      }

      // Attraction along connections
      const nodeMap = new Map(currentNodes.map((n) => [n.id, n]));
      for (const conn of currentConnections) {
        const source = nodeMap.get(conn.sourceId);
        const target = nodeMap.get(conn.targetId);
        if (!source || !target) continue;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = dist * cfg.attraction * conn.strength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        const fs = forces.get(source.id)!;
        const ft = forces.get(target.id)!;
        fs.fx += fx;
        fs.fy += fy;
        ft.fx -= fx;
        ft.fy -= fy;
      }

      // Parent-child attraction
      for (const node of currentNodes) {
        if (!node.parentIds || node.parentIds.length === 0) continue;
        for (const parentId of node.parentIds) {
          const parent = nodeMap.get(parentId);
          if (!parent) continue;

          const dx = parent.x - node.x;
          const dy = parent.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          const force = dist * cfg.parentAttraction;
          const fn = forces.get(node.id)!;
          fn.fx += (dx / dist) * force;
          fn.fy += (dy / dist) * force;
        }
      }

      // Center gravity
      for (const node of currentNodes) {
        const f = forces.get(node.id)!;
        f.fx += (cx - node.x) * cfg.centerGravity;
        f.fy += (cy - node.y) * cfg.centerGravity;
      }

      // Apply forces
      let totalVelocity = 0;
      for (const node of currentNodes) {
        if (node.id === draggingId.current) continue;

        const f = forces.get(node.id)!;
        const v = velocities.current.get(node.id) ?? { vx: 0, vy: 0 };

        v.vx = (v.vx + f.fx) * cfg.damping;
        v.vy = (v.vy + f.fy) * cfg.damping;

        const speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy);
        totalVelocity += speed;

        if (speed > cfg.minVelocity) {
          const maxV = 6;
          if (speed > maxV) {
            v.vx = (v.vx / speed) * maxV;
            v.vy = (v.vy / speed) * maxV;
          }
          onNodeMoveRef.current(node.id, node.x + v.vx, node.y + v.vy);
        }

        velocities.current.set(node.id, v);
      }

      if (totalVelocity < cfg.minVelocity * currentNodes.length) {
        isRunning.current = false;
        return;
      }

      rafId.current = requestAnimationFrame(tick);
    };

    const timer = setTimeout(() => {
      rafId.current = requestAnimationFrame(tick);
    }, 500);

    return () => {
      clearTimeout(timer);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      isRunning.current = false;
    };
    // Only restart simulation when node/connection count changes, not on position updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, connections.length, enabled]);

  return { setDragging };
}
