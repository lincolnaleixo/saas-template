import { query, mutation, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { deriveSubscriptionPayload } from "./subscriptions";
import { deleteOrganizationCascade, deleteOrganizationIfEmpty } from "./organizationCleanup";

type AnyCtx = MutationCtx | QueryCtx;

async function ensureSuperAdmin(ctx: AnyCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (user?.superRole !== "super_admin") {
    throw new Error("Super admin access required");
  }
  return user;
}

async function deletePagePermissionsForUserInOrg(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  const permissions = await ctx.db
    .query("pagePermissions")
    .withIndex("by_organization_and_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .collect();

  await Promise.all(permissions.map((permission) => ctx.db.delete(permission._id)));
}

async function deleteUserAccount(ctx: MutationCtx, targetUserId: Id<"users">) {
  const user = await ctx.db.get(targetUserId);
  if (!user) {
    return;
  }

  if (user.superRole === "super_admin") {
    throw new Error("Cannot delete a super admin account");
  }

  const memberships = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user", (q) => q.eq("userId", targetUserId))
    .collect();

  for (const membership of memberships) {
    await deletePagePermissionsForUserInOrg(ctx, membership.organizationId, targetUserId);
    await ctx.db.delete(membership._id);

    await deleteOrganizationIfEmpty(ctx, membership.organizationId);
  }

  if (user.email) {
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .collect();
    await Promise.all(invitations.map((invitation) => ctx.db.delete(invitation._id)));
  }

  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_user_id", (q) => q.eq("userId", targetUserId))
    .collect();
  await Promise.all(sessions.map((session) => ctx.db.delete(session._id)));

  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_user_id", (q) => q.eq("userId", targetUserId))
    .collect();
  await Promise.all(accounts.map((account) => ctx.db.delete(account._id)));

  await ctx.db.delete(targetUserId);
}

export const getAllOrganizations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ensureSuperAdmin(ctx, userId);

    const organizations = await ctx.db.query("organizations").collect();

    return await Promise.all(
      organizations.map(async (organization) => {
        const members = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
          .collect();

        const subscription = deriveSubscriptionPayload(organization);

        return {
          ...organization,
          role: "super_admin" as const,
          membersCount: members.length,
          planId: subscription.planId,
          billingStatus: subscription.billingStatus,
        };
      })
    );
  },
});

export const getAllUsers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ensureSuperAdmin(ctx, userId);

    const [users, memberships, organizations] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("organizationMembers").collect(),
      ctx.db.query("organizations").collect(),
    ]);

    const organizationById = new Map(
      organizations.map((organization) => [organization._id, organization])
    );

    const membershipsByUser = new Map<Id<"users">, typeof memberships>();

    for (const membership of memberships) {
      const list = membershipsByUser.get(membership.userId);
      if (list) {
        list.push(membership);
      } else {
        membershipsByUser.set(membership.userId, [membership]);
      }
    }

    return users.map((user) => {
      const userMemberships = membershipsByUser.get(user._id) ?? [];

      const organizationsForUser = userMemberships.map((membership) => {
        const organization = organizationById.get(membership.organizationId);

        return {
          organizationId: membership.organizationId,
          organizationName: organization?.name ?? null,
          organizationSlug: organization?.slug ?? null,
          role: membership.role,
        };
      });

      return {
        ...user,
        organizations: organizationsForUser,
      };
    });
  },
});

export const setSuperRole = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.id("users"),
    superRole: v.optional(v.literal("super_admin")),
  },
  handler: async (ctx, { userId, targetUserId, superRole }) => {
    await ensureSuperAdmin(ctx, userId);

    await ctx.db.patch(targetUserId, {
      superRole: superRole ?? undefined,
    });

    return { targetUserId, superRole: superRole ?? null };
  },
});

export const forceSetSuperRole = internalMutation({
  args: {
    targetUserId: v.id("users"),
    superRole: v.optional(v.literal("super_admin")),
  },
  handler: async (ctx, { targetUserId, superRole }) => {
    await ctx.db.patch(targetUserId, {
      superRole: superRole ?? undefined,
    });
  },
});

export const deleteOrganization = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { userId, organizationId }) => {
    await ensureSuperAdmin(ctx, userId);

    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    const memberUserIds = new Set<Id<"users">>(memberships.map((membership) => membership.userId));

    for (const membership of memberships) {
      await deletePagePermissionsForUserInOrg(ctx, organizationId, membership.userId);
      await ctx.db.delete(membership._id);
    }

    await deleteOrganizationCascade(ctx, organizationId);

    for (const memberUserId of memberUserIds) {
      const remainingMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q) => q.eq("userId", memberUserId))
        .first();

      if (!remainingMembership) {
        const memberUser = await ctx.db.get(memberUserId);
        if (memberUser?.superRole === "super_admin") {
          continue;
        }
        await deleteUserAccount(ctx, memberUserId);
      }
    }

    return { organizationId };
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { userId, targetUserId }) => {
    await ensureSuperAdmin(ctx, userId);

    if (userId === targetUserId) {
      throw new Error("You cannot delete your own account");
    }

    const targetUser = await ctx.db.get(targetUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser.superRole === "super_admin") {
      throw new Error("Cannot delete another super admin account");
    }

    await deleteUserAccount(ctx, targetUserId);

    return { targetUserId };
  },
});
