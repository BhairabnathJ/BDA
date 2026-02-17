import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const templateValidator = v.object({
  promptA: v.optional(v.string()),
  promptB: v.optional(v.string()),
  promptC: v.optional(v.string()),
  promptD: v.optional(v.string()),
  promptE: v.optional(v.string()),
});

export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("prompt_profiles").order("desc").collect();
  },
});

export const getActiveProfile = query({
  args: {},
  handler: async (ctx) => {
    const active = await ctx.db
      .query("prompt_profiles")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return active[0] ?? null;
  },
});

export const upsertProfile = mutation({
  args: {
    profileId: v.string(),
    version: v.string(),
    templates: templateValidator,
    makeActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("prompt_profiles")
      .withIndex("by_profile_id", (q) => q.eq("profileId", args.profileId))
      .first();

    if (args.makeActive) {
      const active = await ctx.db
        .query("prompt_profiles")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
      for (const row of active) {
        if (existing && row._id === existing._id) continue;
        await ctx.db.patch(row._id, { isActive: false, updatedAt: now });
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        version: args.version,
        templates: args.templates,
        isActive: args.makeActive ?? existing.isActive,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("prompt_profiles", {
      profileId: args.profileId,
      version: args.version,
      templates: args.templates,
      isActive: args.makeActive ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setActiveProfile = mutation({
  args: {
    profileId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const all = await ctx.db.query("prompt_profiles").collect();
    let activated = false;
    for (const profile of all) {
      const shouldBeActive = profile.profileId === args.profileId;
      if (profile.isActive !== shouldBeActive) {
        await ctx.db.patch(profile._id, { isActive: shouldBeActive, updatedAt: now });
      }
      if (shouldBeActive) activated = true;
    }
    return activated;
  },
});

export const ensureDefaultProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const anyProfile = await ctx.db.query("prompt_profiles").first();
    if (anyProfile) return anyProfile._id;
    const now = Date.now();
    return await ctx.db.insert("prompt_profiles", {
      profileId: "default/topics_v1",
      version: "v1",
      templates: {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
