import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
