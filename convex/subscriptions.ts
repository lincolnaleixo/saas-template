import { query, mutation, internalMutation } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  PlanId,
  getDefaultPlan,
  getFeatureAccess,
  getPlan,
  getTrialDurationMs,
  isPlanId,
} from "../lib/subscription-plans";

type ManagerCtx = MutationCtx | QueryCtx;
type OrganizationDoc = Doc<"organizations">;

function resolvePlanId(rawPlanId: string | undefined): PlanId {
  if (isPlanId(rawPlanId ?? null)) {
    return rawPlanId as PlanId;
  }
  return getDefaultPlan();
}

async function ensureBillingManager(
  ctx: ManagerCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  const actingUser = await ctx.db.get(userId);
  if (actingUser?.superRole === "super_admin") {
    return;
  }

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_and_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .first();

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Only workspace admins can manage billing");
  }
}

export function deriveSubscriptionPayload(
  organization: Partial<OrganizationDoc> | null | undefined
) {
  const now = Date.now();
  let planId = resolvePlanId(organization?.planId);
  let billingStatus = (organization?.billingStatus as
    | "trialing"
    | "active"
    | "trial_expired"
    | "canceled"
    | undefined) ?? "active";
  const trialEndsAt = organization?.trialEndsAt ?? null;
  const cancellationEffectiveAt = organization?.cancellationEffectiveAt ?? null;

  if (billingStatus === "trialing" && trialEndsAt && trialEndsAt < now) {
    billingStatus = "trial_expired";
  }

  if (billingStatus === "canceled" || billingStatus === "trial_expired") {
    if (!cancellationEffectiveAt || cancellationEffectiveAt <= now) {
      planId = getDefaultPlan();
    }
  }

  if (
    cancellationEffectiveAt &&
    cancellationEffectiveAt <= now &&
    billingStatus !== "trialing"
  ) {
    planId = getDefaultPlan();
  }

  const trialPlanId =
    organization?.trialPlanId && isPlanId(organization.trialPlanId)
      ? (organization.trialPlanId as PlanId)
      : null;

  const plan = getPlan(planId);
  const trialRemainingMs =
    billingStatus === "trialing" && trialEndsAt ? Math.max(0, trialEndsAt - now) : 0;
  const features = getFeatureAccess(planId);

  return {
    planId,
    billingStatus,
    trialEndsAt,
    trialStartedAt: organization?.trialStartedAt ?? null,
    trialPlanId,
    trialEndedAt: organization?.trialEndedAt ?? null,
    trialRemainingMs,
    features,
    plan,
    subscriptionProvider: organization?.subscriptionProvider ?? null,
    subscriptionId: organization?.subscriptionId ?? null,
    subscriptionCustomerId: organization?.subscriptionCustomerId ?? null,
    subscriptionPriceId: organization?.subscriptionPriceId ?? null,
    subscriptionCurrentPeriodEnd: organization?.subscriptionCurrentPeriodEnd ?? null,
    cancellationEffectiveAt,
  };
}

export const getOrganizationSubscription = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const organization = await ctx.db.get(organizationId);

    if (!organization) {
      const planId = getDefaultPlan();
      return {
        planId,
        billingStatus: "active",
        trialEndsAt: null,
        trialStartedAt: null,
        trialPlanId: null,
        trialEndedAt: null,
        trialRemainingMs: 0,
        features: getFeatureAccess(planId),
        plan: getPlan(planId),
        subscriptionProvider: null,
        subscriptionId: null,
        subscriptionCustomerId: null,
        subscriptionPriceId: null,
        subscriptionCurrentPeriodEnd: null,
        cancellationEffectiveAt: null,
      };
    }

    return deriveSubscriptionPayload(organization);
  },
});

export const getOrganizationBillingContext = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, { organizationId, userId }) => {
    await ensureBillingManager(ctx, organizationId, userId);

    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    return organization;
  },
});

export const updateOrganizationPlan = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    planId: v.string(),
  },
  handler: async (ctx, { organizationId, userId, planId }) => {
    await ensureBillingManager(ctx, organizationId, userId);

    if (!isPlanId(planId)) {
      throw new Error("Unsupported plan");
    }

    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const trialDuration = getTrialDurationMs();
    const hasTrial = trialDuration > 0;
    const now = Date.now();
    const trialAlreadyUsed = Boolean(organization.trialEndedAt);
    const isTrialAvailable = hasTrial && !trialAlreadyUsed;

    let billingStatus: "active" | "trialing" | "canceled" | "trial_expired" = "active";
    let trialEndsAt: number | undefined = organization.trialEndsAt;
    let trialStartedAt: number | undefined = organization.trialStartedAt;
    const existingTrialPlanId = organization.trialPlanId;
    let trialPlanId: PlanId | undefined =
      existingTrialPlanId && isPlanId(existingTrialPlanId) ? existingTrialPlanId : undefined;
    let trialEndedAt: number | undefined = organization.trialEndedAt;

    if (planId === getDefaultPlan()) {
      billingStatus = "active";
      trialEndsAt = undefined;
      trialStartedAt = organization.trialStartedAt;
      trialPlanId = organization.trialPlanId && isPlanId(organization.trialPlanId)
        ? organization.trialPlanId
        : undefined;
    } else if (isTrialAvailable) {
      billingStatus = "trialing";
      trialStartedAt = now;
      trialEndsAt = now + trialDuration;
      trialPlanId = planId;
      trialEndedAt = undefined;
    } else {
      billingStatus = "active";
      trialEndsAt = organization.trialEndsAt;
      trialStartedAt = organization.trialStartedAt;
    }

    const patch: Partial<OrganizationDoc> = {
      planId,
      billingStatus,
      trialEndsAt,
      trialStartedAt,
      trialPlanId,
      trialEndedAt,
    };

    if (planId === getDefaultPlan()) {
      patch.subscriptionProvider = undefined;
      patch.subscriptionId = undefined;
      patch.subscriptionPriceId = undefined;
      patch.subscriptionCurrentPeriodEnd = undefined;
      patch.cancellationEffectiveAt = undefined;
    }

    await ctx.db.patch(organizationId, patch);

    return deriveSubscriptionPayload({
      ...organization,
      ...patch,
    });
  },
});

export const downgradeToFree = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, { organizationId, userId }) => {
    await ensureBillingManager(ctx, organizationId, userId);

    await ctx.db.patch(organizationId, {
      planId: getDefaultPlan(),
      billingStatus: "active",
      cancellationEffectiveAt: undefined,
      subscriptionProvider: undefined,
      subscriptionId: undefined,
      subscriptionPriceId: undefined,
      subscriptionCurrentPeriodEnd: undefined,
    });

    const planId = getDefaultPlan();
    return deriveSubscriptionPayload({
      planId,
      billingStatus: "active",
    });
  },
});

type BillingStatus = "trialing" | "active" | "trial_expired" | "canceled";

function mapStripeStatus(status: string | null | undefined): BillingStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "incomplete_expired":
      return "trial_expired";
    case "active":
    case "past_due":
    case "incomplete":
    default:
      return "active";
  }
}

function coercePlanId(value: string | null | undefined, fallback?: PlanId): PlanId {
  if (isPlanId(value)) {
    return value;
  }
  return fallback ?? getDefaultPlan();
}

export const syncSubscriptionFromStripe = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    planId: v.string(),
    subscriptionId: v.optional(v.string()),
    subscriptionCustomerId: v.optional(v.string()),
    subscriptionPriceId: v.optional(v.string()),
    status: v.optional(v.string()),
    cancelAt: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    currentPeriodEnd: v.optional(v.number()),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
  },
  handler: async (
    ctx,
    {
      organizationId,
      planId: requestedPlanId,
      subscriptionId,
      subscriptionCustomerId,
      subscriptionPriceId,
      status,
      cancelAt,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      trialStart,
      trialEnd,
    }
  ) => {
    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      return;
    }

    const normalizedStatus = mapStripeStatus(status ?? null);
    const now = Date.now();

    let nextPlanId = coercePlanId(requestedPlanId, resolvePlanId(organization.planId));
    const nextBillingStatus: BillingStatus = normalizedStatus;
    let cancellationEffectiveAt: number | undefined = undefined;

    if (normalizedStatus === "canceled" || normalizedStatus === "trial_expired") {
      nextPlanId = getDefaultPlan();
    }

    if (normalizedStatus === "active" || normalizedStatus === "trialing") {
      if (cancelAt && cancelAt > now) {
        cancellationEffectiveAt = cancelAt;
      } else if (cancelAtPeriodEnd && currentPeriodEnd && currentPeriodEnd > now) {
        cancellationEffectiveAt = currentPeriodEnd;
      }
    }

    const patch: Partial<OrganizationDoc> = {
      planId: nextPlanId,
      billingStatus: nextBillingStatus,
      subscriptionProvider:
        normalizedStatus === "active" || normalizedStatus === "trialing" ? "stripe" : undefined,
      subscriptionId:
        normalizedStatus === "active" || normalizedStatus === "trialing"
          ? subscriptionId ?? organization.subscriptionId
          : undefined,
      subscriptionCustomerId: subscriptionCustomerId ?? organization.subscriptionCustomerId,
      subscriptionPriceId:
        normalizedStatus === "active" || normalizedStatus === "trialing"
          ? subscriptionPriceId ?? organization.subscriptionPriceId
          : undefined,
      subscriptionCurrentPeriodEnd:
        currentPeriodEnd ?? (normalizedStatus === "active" || normalizedStatus === "trialing"
          ? organization.subscriptionCurrentPeriodEnd
          : undefined),
      cancellationEffectiveAt,
    };

    if (trialStart !== undefined) {
      patch.trialStartedAt = trialStart;
    }
    if (trialEnd !== undefined) {
      patch.trialEndsAt = trialEnd;
      if (normalizedStatus === "trialing") {
        patch.trialPlanId = nextPlanId;
        patch.trialEndedAt = undefined;
      } else {
        patch.trialEndedAt = trialEnd;
      }
    } else if (normalizedStatus !== "trialing") {
      const existingTrialPlan = isPlanId(organization.trialPlanId ?? null)
        ? (organization.trialPlanId as PlanId)
        : undefined;
      patch.trialPlanId = existingTrialPlan;
      patch.trialEndedAt = organization.trialEndedAt ?? organization.trialEndsAt ?? undefined;
    }

    await ctx.db.patch(organizationId, patch);

    return deriveSubscriptionPayload({
      ...organization,
      ...patch,
    });
  },
});
