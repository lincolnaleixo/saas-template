import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const pageType = v.union(
  v.literal("dashboard"),
  v.literal("analytics"),
  v.literal("reports"),
  v.literal("projects"),
  v.literal("team")
);

// Get user's page permissions for an organization
export const getUserPagePermissions = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, { organizationId, userId }) => {
    // Get the user's role in the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", userId)
      )
      .first();

    const superAdmin = ((await ctx.db.get(userId))?.superRole ?? null) === "super_admin";

    if (!membership) {
      if (superAdmin) {
        return {
          dashboard: true,
          analytics: true,
          reports: true,
          projects: true,
          team: true,
        };
      }
      return null;
    }

    // Owner and admin have access to all pages by default
    if (membership.role === "owner" || membership.role === "admin" || superAdmin) {
      return {
        dashboard: true,
        analytics: true,
        reports: true,
        projects: true,
        team: true,
      };
    }

    // For members, get their specific permissions
    const permissions = await ctx.db
      .query("pagePermissions")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", userId)
      )
      .collect();

    // Default all pages to true for members (if no permissions set)
    const pagePermissions: Record<string, boolean> = {
      dashboard: true,
      analytics: true,
      reports: true,
      projects: true,
      team: true,
    };

    // Override with specific permissions
    permissions.forEach((perm) => {
      pagePermissions[perm.page] = perm.canAccess;
    });

    return pagePermissions;
  },
});

// Get all page permissions for all users in an organization
export const getOrganizationPagePermissions = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, { organizationId, userId }) => {
    const actorIsSuperAdmin = ((await ctx.db.get(userId))?.superRole ?? null) === "super_admin";

    if (!actorIsSuperAdmin) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", organizationId).eq("userId", userId)
        )
        .first();

      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        throw new Error("Only owners, admins, or super admins can view permissions");
      }
    }

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    const result = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);

        // Owner and admin have all permissions
        if (membership.role === "owner" || membership.role === "admin") {
          return {
            userId: membership.userId,
            userName: user?.name,
            userEmail: user?.email,
            role: membership.role,
            permissions: {
              dashboard: true,
              analytics: true,
              reports: true,
              projects: true,
              team: true,
            },
          };
        }

        // Get member permissions
        const permissions = await ctx.db
          .query("pagePermissions")
          .withIndex("by_organization_and_user", (q) =>
            q.eq("organizationId", organizationId).eq("userId", membership.userId)
          )
          .collect();

        const pagePermissions: Record<string, boolean> = {
          dashboard: true,
          analytics: true,
          reports: true,
          projects: true,
          team: true,
        };

        permissions.forEach((perm) => {
          pagePermissions[perm.page] = perm.canAccess;
        });

        return {
          userId: membership.userId,
          userName: user?.name,
          userEmail: user?.email,
          role: membership.role,
          permissions: pagePermissions,
        };
      })
    );

    return result;
  },
});

// Update user's page permission
export const updatePagePermission = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    targetUserId: v.id("users"),
    page: pageType,
    canAccess: v.boolean(),
  },
  handler: async (ctx, { organizationId, userId, targetUserId, page, canAccess }) => {
    // Check if the user performing the action is owner or admin
    const actorIsSuperAdmin = ((await ctx.db.get(userId))?.superRole ?? null) === "super_admin";
    let userMembership = null;

    if (!actorIsSuperAdmin) {
      userMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", organizationId).eq("userId", userId)
        )
        .first();

      if (!userMembership || (userMembership.role !== "owner" && userMembership.role !== "admin")) {
        throw new Error("Only owners and admins can modify permissions");
      }
    }

    // Check target user's role
    const targetMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", targetUserId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("Target user is not a member of this organization");
    }

    // Cannot modify permissions for owners or admins
    if (!actorIsSuperAdmin && (targetMembership.role === "owner" || targetMembership.role === "admin")) {
      throw new Error("Cannot modify permissions for owners or admins");
    }

    // Check if permission already exists
    const existing = await ctx.db
      .query("pagePermissions")
      .withIndex("by_organization_user_and_page", (q) =>
        q.eq("organizationId", organizationId).eq("userId", targetUserId).eq("page", page)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        canAccess,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("pagePermissions", {
        organizationId,
        userId: targetUserId,
        page,
        canAccess,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    }
  },
});

// Batch update permissions for a user
export const updateUserPermissions = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    targetUserId: v.id("users"),
    permissions: v.object({
      dashboard: v.boolean(),
      analytics: v.boolean(),
      reports: v.boolean(),
      projects: v.boolean(),
      team: v.boolean(),
    }),
  },
  handler: async (ctx, { organizationId, userId, targetUserId, permissions }) => {
    // Check if the user performing the action is owner or admin
    const actorIsSuperAdmin = ((await ctx.db.get(userId))?.superRole ?? null) === "super_admin";
    let userMembership = null;

    if (!actorIsSuperAdmin) {
      userMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", organizationId).eq("userId", userId)
        )
        .first();

      if (!userMembership || (userMembership.role !== "owner" && userMembership.role !== "admin")) {
        throw new Error("Only owners and admins can modify permissions");
      }
    }

    // Check target user's role
    const targetMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", targetUserId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("Target user is not a member of this organization");
    }

    // Cannot modify permissions for owners or admins
    if (!actorIsSuperAdmin && (targetMembership.role === "owner" || targetMembership.role === "admin")) {
      throw new Error("Cannot modify permissions for owners or admins");
    }

    // Update all permissions
    const pages: Array<"dashboard" | "analytics" | "reports" | "projects" | "team"> = [
      "dashboard",
      "analytics",
      "reports",
      "projects",
      "team",
    ];

    for (const page of pages) {
      const existing = await ctx.db
        .query("pagePermissions")
        .withIndex("by_organization_user_and_page", (q) =>
          q.eq("organizationId", organizationId).eq("userId", targetUserId).eq("page", page)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          canAccess: permissions[page],
          updatedAt: Date.now(),
          updatedBy: userId,
        });
      } else {
        await ctx.db.insert("pagePermissions", {
          organizationId,
          userId: targetUserId,
          page,
          canAccess: permissions[page],
          updatedAt: Date.now(),
          updatedBy: userId,
        });
      }
    }

    return true;
  },
});
