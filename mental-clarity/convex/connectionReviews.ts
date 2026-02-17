import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertReview = mutation({
  args: {
    runId: v.id("ai_runs"),
    connectionKey: v.string(),
    sourceLabel: v.string(),
    targetLabel: v.string(),
    type: v.string(),
    label: v.string(),
    verdict: v.union(v.literal("accept"), v.literal("reject")),
    reviewer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("connection_reviews")
      .withIndex("by_run_key", (q) =>
        q.eq("runId", args.runId).eq("connectionKey", args.connectionKey),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sourceLabel: args.sourceLabel,
        targetLabel: args.targetLabel,
        type: args.type,
        label: args.label,
        verdict: args.verdict,
        reviewer: args.reviewer,
        createdAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("connection_reviews", {
      runId: args.runId,
      connectionKey: args.connectionKey,
      sourceLabel: args.sourceLabel,
      targetLabel: args.targetLabel,
      type: args.type,
      label: args.label,
      verdict: args.verdict,
      reviewer: args.reviewer,
      createdAt: Date.now(),
    });
  },
});

export const listByRun = query({
  args: {
    runId: v.id("ai_runs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("connection_reviews")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
  },
});
