import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

type GraphNode = {
  id: string;
  label: string;
  kind?: string;
  category?: string;
  parentIds?: string[];
};

type GraphConnection = {
  sourceId: string;
  targetId: string;
  strength?: number;
};

type ParentRepairReason =
  | "umbrella_parent_cleared"
  | "connected_umbrella_inference"
  | "category_umbrella_fallback"
  | "highest_frequency_umbrella_fallback";

type ParentRepair = {
  nodeId: string;
  label: string;
  beforeParentIds: string[];
  afterParentIds: string[];
  reason: ParentRepairReason;
};

function normalizeNode(raw: Record<string, unknown>): GraphNode | null {
  if (typeof raw.id !== "string" || raw.id.length === 0) return null;
  return {
    id: raw.id,
    label: typeof raw.label === "string" ? raw.label : raw.id,
    kind: typeof raw.kind === "string" ? raw.kind : undefined,
    category: typeof raw.category === "string" ? raw.category : undefined,
    parentIds: Array.isArray(raw.parentIds)
      ? raw.parentIds.filter((p): p is string => typeof p === "string")
      : undefined,
  };
}

function normalizeConnection(raw: Record<string, unknown>): GraphConnection | null {
  if (typeof raw.sourceId !== "string" || typeof raw.targetId !== "string") {
    return null;
  }
  return {
    sourceId: raw.sourceId,
    targetId: raw.targetId,
    strength: typeof raw.strength === "number" ? raw.strength : undefined,
  };
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function chooseUmbrellaByFrequency(
  umbrellaIds: string[],
  mentionCounts: Map<string, number>,
): string | undefined {
  const sorted = [...umbrellaIds].sort((a, b) => {
    const delta = (mentionCounts.get(b) ?? 0) - (mentionCounts.get(a) ?? 0);
    if (delta !== 0) return delta;
    return a.localeCompare(b);
  });
  return sorted[0];
}

function buildRepairPlan(
  nodesById: Map<string, GraphNode>,
  connections: GraphConnection[],
  mentionCounts: Map<string, number>,
): ParentRepair[] {
  const repairs: ParentRepair[] = [];
  const nodes = [...nodesById.values()];
  const umbrellaIds = nodes
    .filter((n) => n.kind === "umbrella")
    .map((n) => n.id);
  const umbrellaIdSet = new Set(umbrellaIds);
  const highestFrequencyUmbrellaId = chooseUmbrellaByFrequency(umbrellaIds, mentionCounts);

  const categoryUmbrella = new Map<string, string>();
  for (const umbrellaId of umbrellaIds) {
    const umbrella = nodesById.get(umbrellaId);
    if (!umbrella?.category) continue;
    const existingId = categoryUmbrella.get(umbrella.category);
    if (!existingId) {
      categoryUmbrella.set(umbrella.category, umbrellaId);
      continue;
    }
    const existingCount = mentionCounts.get(existingId) ?? 0;
    const nextCount = mentionCounts.get(umbrellaId) ?? 0;
    if (nextCount > existingCount) {
      categoryUmbrella.set(umbrella.category, umbrellaId);
    }
  }

  for (const node of nodes) {
    const beforeParentIds = [...(node.parentIds ?? [])].sort();

    if (node.kind === "umbrella") {
      if (beforeParentIds.length > 0) {
        repairs.push({
          nodeId: node.id,
          label: node.label,
          beforeParentIds,
          afterParentIds: [],
          reason: "umbrella_parent_cleared",
        });
      }
      continue;
    }

    if (beforeParentIds.length > 0) continue;

    const umbrellaScores = new Map<string, number>();
    for (const connection of connections) {
      let otherId: string | null = null;
      if (connection.sourceId === node.id) {
        otherId = connection.targetId;
      } else if (connection.targetId === node.id) {
        otherId = connection.sourceId;
      }

      if (!otherId || !umbrellaIdSet.has(otherId)) continue;
      const current = umbrellaScores.get(otherId) ?? 0;
      const strength = typeof connection.strength === "number" ? connection.strength : 0.5;
      umbrellaScores.set(otherId, current + strength);
    }

    const connectedParentIds = [...umbrellaScores.entries()]
      .sort((a, b) => {
        const scoreDelta = b[1] - a[1];
        if (scoreDelta !== 0) return scoreDelta;
        return a[0].localeCompare(b[0]);
      })
      .slice(0, 2)
      .map(([id]) => id)
      .sort();

    if (connectedParentIds.length > 0 && !sameIds(beforeParentIds, connectedParentIds)) {
      repairs.push({
        nodeId: node.id,
        label: node.label,
        beforeParentIds,
        afterParentIds: connectedParentIds,
        reason: "connected_umbrella_inference",
      });
      continue;
    }

    if (node.category) {
      const categoryParentId = categoryUmbrella.get(node.category);
      if (categoryParentId) {
        const afterParentIds = [categoryParentId];
        if (!sameIds(beforeParentIds, afterParentIds)) {
          repairs.push({
            nodeId: node.id,
            label: node.label,
            beforeParentIds,
            afterParentIds,
            reason: "category_umbrella_fallback",
          });
          continue;
        }
      }
    }

    if (highestFrequencyUmbrellaId) {
      const afterParentIds = [highestFrequencyUmbrellaId];
      if (!sameIds(beforeParentIds, afterParentIds)) {
        repairs.push({
          nodeId: node.id,
          label: node.label,
          beforeParentIds,
          afterParentIds,
          reason: "highest_frequency_umbrella_fallback",
        });
      }
    }
  }

  return repairs;
}

async function collectLatestGraph(ctx: any) {
  const thoughts = await ctx.db.query("thoughts").order("desc").collect();
  const nodesById = new Map<string, GraphNode>();
  const mentionCounts = new Map<string, number>();
  const connections: GraphConnection[] = [];

  for (const thought of thoughts) {
    const seenInThought = new Set<string>();

    for (const rawNode of thought.nodes as Array<Record<string, unknown>>) {
      const node = normalizeNode(rawNode);
      if (!node) continue;

      if (!nodesById.has(node.id)) {
        nodesById.set(node.id, node);
      }

      if (!seenInThought.has(node.id)) {
        seenInThought.add(node.id);
        mentionCounts.set(node.id, (mentionCounts.get(node.id) ?? 0) + 1);
      }
    }

    for (const rawConnection of thought.connections as Array<Record<string, unknown>>) {
      const connection = normalizeConnection(rawConnection);
      if (!connection) continue;
      connections.push(connection);
    }
  }

  return { thoughts, nodesById, mentionCounts, connections };
}

export const create = mutation({
  args: {
    text: v.string(),
    nodes: v.array(v.any()),
    connections: v.array(v.any()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("thoughts", {
      text: args.text,
      nodes: args.nodes,
      connections: args.connections,
      createdAt: args.createdAt,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("thoughts").order("desc").collect();
  },
});

export const listNodeStats = query({
  args: {},
  handler: async (ctx) => {
    const { nodesById, mentionCounts } = await collectLatestGraph(ctx);

    return [...nodesById.values()]
      .map((node) => ({
        nodeId: node.id,
        label: node.label,
        kind: node.kind ?? "subnode",
        category: node.category ?? null,
        mentionCount: mentionCounts.get(node.id) ?? 0,
        parentIds: [...(node.parentIds ?? [])].sort(),
      }))
      .sort((a, b) => {
        const mentionDelta = b.mentionCount - a.mentionCount;
        if (mentionDelta !== 0) return mentionDelta;
        return a.label.localeCompare(b.label);
      });
  },
});

export const previewHierarchyRepair = query({
  args: {},
  handler: async (ctx) => {
    const { thoughts, nodesById, mentionCounts, connections } = await collectLatestGraph(ctx);
    const repairs = buildRepairPlan(nodesById, connections, mentionCounts);
    const repairNodeIds = new Set(repairs.map((r) => r.nodeId));

    let affectedThoughts = 0;
    for (const thought of thoughts) {
      const hasRepairNode = (thought.nodes as Array<Record<string, unknown>>).some(
        (rawNode) => typeof rawNode.id === "string" && repairNodeIds.has(rawNode.id),
      );
      if (hasRepairNode) affectedThoughts += 1;
    }

    return {
      totalNodes: nodesById.size,
      umbrellaCount: [...nodesById.values()].filter((n) => n.kind === "umbrella").length,
      subnodeCount: [...nodesById.values()].filter((n) => n.kind !== "umbrella").length,
      nodesNeedingRepair: repairs.length,
      affectedThoughts,
      repairs: repairs.slice(0, 250),
      truncated: repairs.length > 250,
    };
  },
});

export const applyHierarchyRepair = mutation({
  args: {},
  handler: async (ctx) => {
    const { thoughts, nodesById, mentionCounts, connections } = await collectLatestGraph(ctx);
    const repairs = buildRepairPlan(nodesById, connections, mentionCounts);
    if (repairs.length === 0) {
      return {
        applied: false,
        updatedThoughts: 0,
        updatedNodeOccurrences: 0,
        repairsApplied: 0,
      };
    }

    const afterParentIdsByNode = new Map(repairs.map((r) => [r.nodeId, r.afterParentIds]));

    let updatedThoughts = 0;
    let updatedNodeOccurrences = 0;

    for (const thought of thoughts) {
      const originalNodes = thought.nodes as Array<Record<string, unknown>>;
      let changed = false;
      const patchedNodes = originalNodes.map((rawNode) => {
        if (typeof rawNode.id !== "string") return rawNode;
        const nextParentIds = afterParentIdsByNode.get(rawNode.id);
        if (!nextParentIds) return rawNode;

        const currentParentIds = Array.isArray(rawNode.parentIds)
          ? rawNode.parentIds.filter((p): p is string => typeof p === "string").sort()
          : [];

        if (sameIds(currentParentIds, nextParentIds)) return rawNode;
        changed = true;
        updatedNodeOccurrences += 1;
        return {
          ...rawNode,
          parentIds: nextParentIds,
          updatedAt: Date.now(),
        };
      });

      if (changed) {
        updatedThoughts += 1;
        await ctx.db.patch(thought._id, { nodes: patchedNodes });
      }
    }

    return {
      applied: true,
      updatedThoughts,
      updatedNodeOccurrences,
      repairsApplied: repairs.length,
    };
  },
});

export const updateNode = mutation({
  args: {
    thoughtId: v.id("thoughts"),
    nodeId: v.string(),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    const thought = await ctx.db.get(args.thoughtId);
    if (!thought) throw new Error("Thought not found");

    const nodes = (thought.nodes as Array<Record<string, unknown>>).map((n) =>
      n.id === args.nodeId ? { ...n, ...args.updates } : n,
    );

    await ctx.db.patch(args.thoughtId, { nodes });
  },
});

export const addConnections = mutation({
  args: {
    thoughtId: v.id("thoughts"),
    connections: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const thought = await ctx.db.get(args.thoughtId);
    if (!thought) throw new Error("Thought not found");

    const existing = (thought.connections as Array<Record<string, unknown>>) ?? [];
    await ctx.db.patch(args.thoughtId, {
      connections: [...existing, ...args.connections],
    });
  },
});

export const deleteNode = mutation({
  args: {
    thoughtId: v.id("thoughts"),
    nodeId: v.string(),
  },
  handler: async (ctx, args) => {
    const thought = await ctx.db.get(args.thoughtId);
    if (!thought) throw new Error("Thought not found");

    const nodes = (thought.nodes as Array<Record<string, unknown>>).filter(
      (n) => n.id !== args.nodeId,
    );
    const connections = (thought.connections as Array<Record<string, unknown>>).filter(
      (c) => c.sourceId !== args.nodeId && c.targetId !== args.nodeId,
    );

    await ctx.db.patch(args.thoughtId, { nodes, connections });
  },
});
