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

    const reviewPatch = {
      connectionKey: args.connectionKey,
      sourceLabel: args.sourceLabel,
      targetLabel: args.targetLabel,
      type: args.type,
      label: args.label,
      verdict: args.verdict,
      reviewer: args.reviewer,
      updatedAt: Date.now(),
    };

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
      const thought = await ctx.db
        .query("thoughts")
        .withIndex("by_run", (q) => q.eq("runId", args.runId))
        .first();
      if (thought) {
        const current = (thought.connectionReviews as Array<typeof reviewPatch>) ?? [];
        const idx = current.findIndex((r) => r.connectionKey === args.connectionKey);
        const next =
          idx >= 0
            ? current.map((r, i) => (i === idx ? reviewPatch : r))
            : [...current, reviewPatch];
        await ctx.db.patch(thought._id, { connectionReviews: next });
      }
      return existing._id;
    }

    const reviewId = await ctx.db.insert("connection_reviews", {
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

    const thought = await ctx.db
      .query("thoughts")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .first();
    if (thought) {
      const current = (thought.connectionReviews as Array<typeof reviewPatch>) ?? [];
      await ctx.db.patch(thought._id, { connectionReviews: [...current, reviewPatch] });
    }

    return reviewId;
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

export const listByRunIds = query({
  args: {
    runIds: v.array(v.id("ai_runs")),
  },
  handler: async (ctx, args) => {
    if (args.runIds.length === 0) return [];
    const byRun = await Promise.all(
      args.runIds.map((runId) =>
        ctx.db
          .query("connection_reviews")
          .withIndex("by_run", (q) => q.eq("runId", runId))
          .collect(),
      ),
    );
    return byRun.flat();
  },
});
