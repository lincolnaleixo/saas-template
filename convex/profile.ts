import { query, mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { deriveSubscriptionPayload } from "./subscriptions";
import { deleteOrganizationIfEmpty } from "./organizationCleanup";
import { getDefaultPlan, type PlanId } from "../lib/subscription-plans";

async function deletePagePermissionsForUser(
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

async function downgradeOrganizationToFree(ctx: MutationCtx, organizationId: Id<"organizations">) {
  await ctx.db.patch(organizationId, {
    planId: getDefaultPlan(),
    billingStatus: "active",
    cancellationEffectiveAt: undefined,
    subscriptionProvider: undefined,
    subscriptionId: undefined,
    subscriptionPriceId: undefined,
    subscriptionCurrentPeriodEnd: undefined,
  });
}

type OrganizationSummary = {
  organizationId: Id<"organizations">;
  organizationName: string;
  organizationSlug: string;
  role: "owner" | "admin" | "member";
  joinedAt: number;
  membersCount: number;
  planId: PlanId;
  planName: string;
  billingStatus: "trialing" | "active" | "trial_expired" | "canceled";
  subscriptionProvider: string | null;
  trialEndsAt: number | null;
};

export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const organizationsWithNulls = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await ctx.db.get(membership.organizationId);
        if (!organization) {
          return null;
        }

        const subscription = deriveSubscriptionPayload(organization);

        const membersCount = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q) => q.eq("organizationId", membership.organizationId))
          .collect();

        return {
          organizationId: membership.organizationId,
          organizationName: organization.name,
          organizationSlug: organization.slug,
          role: membership.role,
          joinedAt: membership.joinedAt,
          membersCount: membersCount.length,
          planId: subscription.planId,
          planName: subscription.plan.name,
          billingStatus: subscription.billingStatus,
          subscriptionProvider: subscription.subscriptionProvider,
          trialEndsAt: subscription.trialEndsAt ?? null,
        } satisfies OrganizationSummary;
      })
    );

    const organizations: OrganizationSummary[] = organizationsWithNulls.filter(
      (org): org is OrganizationSummary => org !== null
    );

    const firstJoinedAt = organizations.reduce<number | null>((earliest, org) => {
      if (!earliest) {
        return org.joinedAt;
      }
      return Math.min(earliest, org.joinedAt);
    }, null);

    return {
      user: {
        ...user,
      },
      organizations,
      metadata: {
        firstJoinedAt,
        totalOrganizations: organizations.length,
        ownedOrganizations: organizations.filter((org) => org.role === "owner").length,
      },
    };
  },
});

export const deleteAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const hasAdminPrivileges =
      user.superRole === "super_admin" ||
      memberships.some((membership) => membership.role === "owner" || membership.role === "admin");

    if (!hasAdminPrivileges) {
      throw new Error("Only workspace admins can delete this account");
    }

    for (const membership of memberships) {
      const organization = await ctx.db.get(membership.organizationId);

      if (organization) {
        const organizationMembers = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q) => q.eq("organizationId", membership.organizationId))
          .collect();

        const otherOwners = organizationMembers.filter(
          (member) => member.userId !== userId && member.role === "owner"
        );

        if (membership.role === "owner" && otherOwners.length === 0) {
          await downgradeOrganizationToFree(ctx, membership.organizationId);
        }

        await deletePagePermissionsForUser(ctx, membership.organizationId, userId);

        await ctx.db.delete(membership._id);

        await deleteOrganizationIfEmpty(ctx, membership.organizationId);
      } else {
        await ctx.db.delete(membership._id);
      }
    }

    if (user.email) {
      const invitations = await ctx.db
        .query("invitations")
        .withIndex("by_email", (q) => q.eq("email", user.email!))
        .collect();
      await Promise.all(invitations.map((invitation) => ctx.db.delete(invitation._id)));
    }

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(sessions.map((session) => ctx.db.delete(session._id)));

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(accounts.map((account) => ctx.db.delete(account._id)));

    await ctx.db.delete(userId);

    return { success: true };
  },
});
