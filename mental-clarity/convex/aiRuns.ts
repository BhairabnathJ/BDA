import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRun = mutation({
  args: {
    dumpText: v.string(),
    model: v.string(),
    promptVersion: v.string(),
    promptProfileId: v.optional(v.string()),
    inputHash: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    mode: v.optional(v.string()),
    backend: v.optional(v.string()),
    quant: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.number(),
    nodeCount: v.number(),
    connectionCount: v.number(),
    aiStatus: v.string(),
    errorMessage: v.optional(v.string()),
    meta: v.optional(v.any()),
    artifacts: v.optional(v.any()),
    quality: v.optional(
      v.object({
        score: v.optional(v.number()),
        note: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const durationMs = args.finishedAt - args.startedAt;
    return await ctx.db.insert("ai_runs", {
      dumpText: args.dumpText,
      model: args.model,
      promptVersion: args.promptVersion,
      promptProfileId: args.promptProfileId,
      inputHash: args.inputHash,
      sessionId: args.sessionId,
      mode: args.mode,
      backend: args.backend,
      quant: args.quant,
      startedAt: args.startedAt,
      finishedAt: args.finishedAt,
      durationMs,
      nodeCount: args.nodeCount,
      connectionCount: args.connectionCount,
      aiStatus: args.aiStatus,
      errorMessage: args.errorMessage,
      meta: args.meta,
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

export const listRunsByInputHash = query({
  args: {
    inputHash: v.string(),
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const all = await ctx.db
      .query("ai_runs")
      .order("desc")
      .take(Math.max(limit * 4, 200));

    return all
      .filter((r) =>
        r.inputHash === args.inputHash &&
        (args.sessionId ? r.sessionId === args.sessionId : true),
      )
      .slice(0, limit);
  },
});

export const setRunQuality = mutation({
  args: {
    runId: v.id("ai_runs"),
    score: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      quality: {
        score: args.score,
        note: args.note,
      },
    });
  },
});
