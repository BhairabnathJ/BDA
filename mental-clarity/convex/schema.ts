import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  thoughts: defineTable({
    text: v.string(),
    nodes: v.array(v.any()),
    connections: v.array(v.any()),
    createdAt: v.number(),
  }),
});
