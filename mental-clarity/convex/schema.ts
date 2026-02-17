import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  thoughts: defineTable({
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
  }).index("by_run", ["runId"]),
  ai_runs: defineTable({
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
    durationMs: v.number(),
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
  }),
  connection_reviews: defineTable({
    runId: v.id("ai_runs"),
    connectionKey: v.string(),
    sourceLabel: v.string(),
    targetLabel: v.string(),
    type: v.string(),
    label: v.string(),
    verdict: v.union(v.literal("accept"), v.literal("reject")),
    createdAt: v.number(),
    reviewer: v.optional(v.string()),
  })
    .index("by_run", ["runId"])
    .index("by_run_key", ["runId", "connectionKey"]),
  prompt_profiles: defineTable({
    profileId: v.string(),
    version: v.string(),
    templates: v.object({
      promptA: v.optional(v.string()),
      promptB: v.optional(v.string()),
      promptC: v.optional(v.string()),
      promptD: v.optional(v.string()),
      promptE: v.optional(v.string()),
    }),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profile_id", ["profileId"])
    .index("by_active", ["isActive"]),
});
