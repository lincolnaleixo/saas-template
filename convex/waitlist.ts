import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all users in waitlist
export const getWaitlistUsers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Verify user is super admin
    const user = await ctx.db.get(userId);
    if (!user || user.superRole !== "super_admin") {
      throw new Error("Only super admins can view waitlist");
    }

    const waitlistUsers = await ctx.db
      .query("users")
      .withIndex("by_waitlist_status", (q) => q.eq("waitlistStatus", "pending"))
      .collect();

    return waitlistUsers.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      image: u.image,
      waitlistStatus: u.waitlistStatus,
      waitlistRequestedAt: u.waitlistRequestedAt,
    }));
  },
});

// Get user's waitlist status
export const getMyWaitlistStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return {
      status: user.waitlistStatus,
      requestedAt: user.waitlistRequestedAt,
      approvedAt: user.waitlistApprovedAt,
    };
  },
});

// Approve user from waitlist
export const approveWaitlistUser = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { userId, targetUserId }) => {
    // Verify user is super admin
    const user = await ctx.db.get(userId);
    if (!user || user.superRole !== "super_admin") {
      throw new Error("Only super admins can approve waitlist users");
    }

    const targetUser = await ctx.db.get(targetUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser.waitlistStatus !== "pending") {
      throw new Error("User is not in waitlist");
    }

    await ctx.db.patch(targetUserId, {
      waitlistStatus: "approved",
      waitlistApprovedAt: Date.now(),
      waitlistApprovedBy: userId,
    });

    // Create default organization for approved user
    const userName = targetUser.name || targetUser.email?.split("@")[0] || "User";
    const slug = `${userName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    const orgId = await ctx.db.insert("organizations", {
      name: `${userName}'s Organization`,
      slug,
      createdBy: targetUserId,
      createdAt: Date.now(),
      planId: "free",
      billingStatus: "active",
    });

    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId: targetUserId,
      role: "owner",
      joinedAt: Date.now(),
    });

    return { approved: true };
  },
});

// Reject user from waitlist
export const rejectWaitlistUser = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { userId, targetUserId }) => {
    // Verify user is super admin
    const user = await ctx.db.get(userId);
    if (!user || user.superRole !== "super_admin") {
      throw new Error("Only super admins can reject waitlist users");
    }

    const targetUser = await ctx.db.get(targetUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser.waitlistStatus !== "pending") {
      throw new Error("User is not in waitlist");
    }

    await ctx.db.patch(targetUserId, {
      waitlistStatus: "rejected",
    });

    return { rejected: true };
  },
});

// Get waitlist stats
export const getWaitlistStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Verify user is super admin
    const user = await ctx.db.get(userId);
    if (!user || user.superRole !== "super_admin") {
      throw new Error("Only super admins can view waitlist stats");
    }

    const pending = await ctx.db
      .query("users")
      .withIndex("by_waitlist_status", (q) => q.eq("waitlistStatus", "pending"))
      .collect();

    const approved = await ctx.db
      .query("users")
      .withIndex("by_waitlist_status", (q) => q.eq("waitlistStatus", "approved"))
      .collect();

    const rejected = await ctx.db
      .query("users")
      .withIndex("by_waitlist_status", (q) => q.eq("waitlistStatus", "rejected"))
      .collect();

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      total: pending.length + approved.length + rejected.length,
    };
  },
});
