import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    text: v.string(),
    nodes: v.array(v.any()),
    connections: v.array(v.any()),
    runId: v.optional(v.id("ai_runs")),
    inputHash: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    mode: v.optional(v.string()),
    backend: v.optional(v.string()),
    quant: v.optional(v.string()),
    promptProfileId: v.optional(v.string()),
    quality: v.optional(
      v.object({
        score: v.optional(v.number()),
        note: v.optional(v.string()),
      }),
    ),
    connectionReviews: v.optional(
      v.array(
        v.object({
          connectionKey: v.string(),
          sourceLabel: v.string(),
          targetLabel: v.string(),
          type: v.string(),
          label: v.string(),
          verdict: v.union(v.literal("accept"), v.literal("reject")),
          reviewer: v.optional(v.string()),
          updatedAt: v.number(),
        }),
      ),
    ),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("thoughts", {
      text: args.text,
      nodes: args.nodes,
      connections: args.connections,
      runId: args.runId,
      inputHash: args.inputHash,
      sessionId: args.sessionId,
      mode: args.mode,
      backend: args.backend,
      quant: args.quant,
      promptProfileId: args.promptProfileId,
      quality: args.quality,
      connectionReviews: args.connectionReviews,
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
