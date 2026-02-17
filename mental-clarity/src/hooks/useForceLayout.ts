import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NodeData, ConnectionData } from '@/types/graph';

interface ForceLayoutConfig {
  /** Repulsion force between all nodes */
  repulsion: number;
  /** Attraction along connections */
  attraction: number;
  /** Parent-child attraction (umbrella pulls subnodes) */
  parentAttraction: number;
  /** Damping factor (0-1, lower = faster settle) */
  damping: number;
  /** Minimum velocity to keep simulating */
  minVelocity: number;
  /** Center gravity strength */
  centerGravity: number;
}

const DEFAULT_CONFIG: ForceLayoutConfig = {
  repulsion: 8000,
  attraction: 0.008,
  parentAttraction: 0.012,
  damping: 0.85,
  minVelocity: 0.1,
  centerGravity: 0.0003,
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
  config: Partial<ForceLayoutConfig> = {},
) {
  const cfg = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.repulsion, config.attraction, config.parentAttraction, config.damping, config.minVelocity, config.centerGravity],
  );
  const velocities = useRef<Map<string, NodeVelocity>>(new Map());
  const rafId = useRef<number>(0);
  const draggingId = useRef<string | null>(null);
  const isRunning = useRef(false);

  // Track which node is being dragged to exclude from physics
  const setDragging = useCallback((nodeId: string | null) => {
    draggingId.current = nodeId;
  }, []);

  useEffect(() => {
    if (!enabled || nodes.length < 2) return;

    // Initialize velocities for new nodes
    for (const node of nodes) {
      if (!velocities.current.has(node.id)) {
        velocities.current.set(node.id, { vx: 0, vy: 0 });
      }
    }

    // Clean up stale entries
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const key of velocities.current.keys()) {
      if (!nodeIds.has(key)) velocities.current.delete(key);
    }

    if (isRunning.current) return;
    isRunning.current = true;

    let tickCount = 0;
    const maxTicks = 300; // Stop after ~5 seconds

    const tick = () => {
      tickCount++;
      if (tickCount > maxTicks) {
        isRunning.current = false;
        return;
      }

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      // Calculate forces
      const forces = new Map<string, { fx: number; fy: number }>();
      for (const node of nodes) {
        forces.set(node.id, { fx: 0, fy: 0 });
      }

      // Repulsion between all node pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Stronger repulsion for nearby nodes
          const force = cfg.repulsion / (dist * dist);
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
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      for (const conn of connections) {
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

      // Parent-child attraction (umbrellas pull subnodes)
      for (const node of nodes) {
        if (!node.parentIds || node.parentIds.length === 0) continue;
        for (const parentId of node.parentIds) {
          const parent = nodeMap.get(parentId);
          if (!parent) continue;

          const dx = parent.x - node.x;
          const dy = parent.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          const force = dist * cfg.parentAttraction;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          const fn = forces.get(node.id)!;
          fn.fx += fx;
          fn.fy += fy;
        }
      }

      // Center gravity
      for (const node of nodes) {
        const f = forces.get(node.id)!;
        f.fx += (cx - node.x) * cfg.centerGravity;
        f.fy += (cy - node.y) * cfg.centerGravity;
      }

      // Apply forces with Verlet integration
      let totalVelocity = 0;
      for (const node of nodes) {
        if (node.id === draggingId.current) continue;

        const f = forces.get(node.id)!;
        const v = velocities.current.get(node.id) ?? { vx: 0, vy: 0 };

        v.vx = (v.vx + f.fx) * cfg.damping;
        v.vy = (v.vy + f.fy) * cfg.damping;

        const speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy);
        totalVelocity += speed;

        if (speed > cfg.minVelocity) {
          // Clamp max velocity
          const maxV = 8;
          if (speed > maxV) {
            v.vx = (v.vx / speed) * maxV;
            v.vy = (v.vy / speed) * maxV;
          }

          onNodeMove(node.id, node.x + v.vx, node.y + v.vy);
        }

        velocities.current.set(node.id, v);
      }

      // Stop when settled
      if (totalVelocity < cfg.minVelocity * nodes.length) {
        isRunning.current = false;
        return;
      }

      rafId.current = requestAnimationFrame(tick);
    };

    // Small delay before starting so initial positions are set
    const timer = setTimeout(() => {
      rafId.current = requestAnimationFrame(tick);
    }, 500);

    return () => {
      clearTimeout(timer);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      isRunning.current = false;
    };
  }, [nodes.length, connections.length, enabled, cfg, nodes, connections, onNodeMove]);

  return { setDragging };
}
