import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getDefaultPlan } from "../lib/subscription-plans";
import { deleteOrganizationIfEmpty } from "./organizationCleanup";

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

// Get user by ID
export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Create user
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
    superRole: v.optional(v.literal("super_admin")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

// Update user
export const updateUser = mutation({
  args: {
    id: v.id("users"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
    superRole: v.optional(v.literal("super_admin")),
    waitlistStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
    waitlistRequestedAt: v.optional(v.number()),
    waitlistApprovedAt: v.optional(v.number()),
    waitlistApprovedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

// Get account by provider
export const getAccountByProvider = query({
  args: {
    provider: v.string(),
    providerAccountId: v.string(),
  },
  handler: async (ctx, { provider, providerAccountId }) => {
    return await ctx.db
      .query("accounts")
      .withIndex("by_provider_and_provider_account_id", (q) =>
        q.eq("provider", provider).eq("providerAccountId", providerAccountId)
      )
      .first();
  },
});

// Create account
export const createAccount = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    provider: v.string(),
    providerAccountId: v.string(),
    refresh_token: v.optional(v.string()),
    access_token: v.optional(v.string()),
    expires_at: v.optional(v.number()),
    token_type: v.optional(v.string()),
    scope: v.optional(v.string()),
    id_token: v.optional(v.string()),
    session_state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("accounts", args);
  },
});

// Get session by token
export const getSessionByToken = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
      .first();
  },
});

// Create session
export const createSession = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    expires: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", args);
  },
});

// Update session
export const updateSession = mutation({
  args: {
    sessionToken: v.string(),
    expires: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, expires }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
      .first();

    if (!session) return null;

    if (expires !== undefined) {
      await ctx.db.patch(session._id, { expires });
    }

    return await ctx.db.get(session._id);
  },
});

// Delete session
export const deleteSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

// Get user organizations
export const getUserOrganizations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        return {
          ...org,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      })
    );

    return organizations.filter((org) => org !== null);
  },
});

// Create organization
export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { name, slug, userId }) => {
    const createdAt = Date.now();
    const planId = getDefaultPlan();

    const orgId = await ctx.db.insert("organizations", {
      name,
      slug,
      createdBy: userId,
      createdAt,
      planId,
      billingStatus: "active",
    });

    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId,
      role: "owner",
      joinedAt: createdAt,
    });

    return orgId;
  },
});

// Get organization by slug
export const getOrganizationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

// Get organization members
export const getOrganizationMembers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return {
          ...user,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      })
    );

    return members.filter((member) => member !== null);
  },
});

// Add member to organization
export const addOrganizationMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      throw new Error("User is already a member of this organization");
    }

    return await ctx.db.insert("organizationMembers", {
      ...args,
      joinedAt: Date.now(),
    });
  },
});

// Remove member from organization
export const removeOrganizationMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { organizationId, userId, targetUserId }) => {
    const actorRecord = await ctx.db.get(userId);
    const actorIsSuperAdmin = actorRecord?.superRole === "super_admin";

    let actorMembership = null;
    if (!actorIsSuperAdmin) {
      actorMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", organizationId).eq("userId", userId)
        )
        .first();

      if (!actorMembership || (actorMembership.role !== "owner" && actorMembership.role !== "admin")) {
        throw new Error("Only owners and admins can remove members");
      }
    }

    const targetMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", targetUserId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("User is not a member of this organization");
    }

    if (targetMembership.role === "owner" && !actorIsSuperAdmin) {
      throw new Error("Cannot remove organization owners");
    }

    await ctx.db.delete(targetMembership._id);

    const existingPermissions = await ctx.db
      .query("pagePermissions")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", targetUserId)
      )
      .collect();

    await Promise.all(existingPermissions.map((permission) => ctx.db.delete(permission._id)));

    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_id", (q) => q.eq("userId", targetUserId))
      .collect();

    await Promise.all(activeSessions.map((session) => ctx.db.delete(session._id)));

    await deleteOrganizationIfEmpty(ctx, organizationId);

    return { removedUserId: targetUserId };
  },
});
