import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  thoughts: defineTable({
    text: v.string(),
    nodes: v.array(v.any()),
    connections: v.array(v.any()),
    createdAt: v.number(),
  }),
  ai_runs: defineTable({
    dumpText: v.string(),
    model: v.string(),
    promptVersion: v.string(),
    startedAt: v.number(),
    finishedAt: v.number(),
    durationMs: v.number(),
    nodeCount: v.number(),
    connectionCount: v.number(),
    aiStatus: v.string(),
    errorMessage: v.optional(v.string()),
    meta: v.optional(v.any()),
  }),
});
