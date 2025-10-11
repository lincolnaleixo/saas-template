import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get a setting by key
export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return setting?.value;
  },
});

// Get waitlist enabled status
export const isWaitlistEnabled = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "waitlist_enabled"))
      .first();
    return setting?.value === true;
  },
});

// Update a setting (admin only)
export const updateSetting = mutation({
  args: {
    userId: v.id("users"),
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, { userId, key, value }) => {
    // Verify user is super admin
    const user = await ctx.db.get(userId);
    if (!user || user.superRole !== "super_admin") {
      throw new Error("Only super admins can update settings");
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("settings", {
        key,
        value,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    }
  },
});

// Toggle waitlist feature
export const toggleWaitlist = mutation({
  args: {
    userId: v.id("users"),
    enabled: v.boolean(),
  },
  handler: async (ctx, { userId, enabled }) => {
    // Verify user is super admin
    const user = await ctx.db.get(userId);
    if (!user || user.superRole !== "super_admin") {
      throw new Error("Only super admins can toggle waitlist");
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "waitlist_enabled"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: enabled,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("settings", {
        key: "waitlist_enabled",
        value: enabled,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    }
  },
});
