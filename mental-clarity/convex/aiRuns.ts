import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRun = mutation({
  args: {
    dumpText: v.string(),
    model: v.string(),
    promptVersion: v.string(),
    startedAt: v.number(),
    finishedAt: v.number(),
    nodeCount: v.number(),
    connectionCount: v.number(),
    aiStatus: v.string(),
    errorMessage: v.optional(v.string()),
    meta: v.optional(v.any()),
    inputHash: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    mode: v.optional(v.string()),
    backend: v.optional(v.string()),
    quant: v.optional(v.string()),
    promptProfileId: v.optional(v.string()),
    artifacts: v.optional(v.any()),
    quality: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const durationMs = args.finishedAt - args.startedAt;
    return await ctx.db.insert("ai_runs", {
      dumpText: args.dumpText,
      model: args.model,
      promptVersion: args.promptVersion,
      startedAt: args.startedAt,
      finishedAt: args.finishedAt,
      durationMs,
      nodeCount: args.nodeCount,
      connectionCount: args.connectionCount,
      aiStatus: args.aiStatus,
      errorMessage: args.errorMessage,
      meta: args.meta,
      inputHash: args.inputHash,
      sessionId: args.sessionId,
      mode: args.mode,
      backend: args.backend,
      quant: args.quant,
      promptProfileId: args.promptProfileId,
      artifacts: args.artifacts,
      quality: args.quality,
    });
  },
});

export const listRuns = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("ai_runs")
      .order("desc")
      .take(limit);
  },
});
