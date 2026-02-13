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
