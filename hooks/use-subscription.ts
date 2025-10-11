"use client";

import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@/contexts/organization-context";
import type { PageFeature, PlanId, SubscriptionPlan } from "@/lib/subscription-plans";

export interface SubscriptionData {
  planId: PlanId;
  billingStatus: "trialing" | "active" | "trial_expired" | "canceled";
  trialEndsAt: number | null;
  trialStartedAt: number | null;
  trialPlanId: PlanId | null;
  trialEndedAt: number | null;
  trialRemainingMs: number;
  features: Record<PageFeature, boolean>;
  plan: SubscriptionPlan;
  subscriptionProvider: string | null;
  subscriptionId: string | null;
  subscriptionCustomerId: string | null;
  subscriptionPriceId: string | null;
  subscriptionCurrentPeriodEnd: number | null;
  cancellationEffectiveAt: number | null;
}

export function useSubscription() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?._id as Id<"organizations"> | undefined;

  const subscription = useQuery(
    api.subscriptions.getOrganizationSubscription,
    organizationId ? { organizationId } : "skip"
  ) as SubscriptionData | undefined;

  const isLoading = organizationId !== undefined && subscription === undefined;

  return {
    subscription,
    isLoading,
    organizationId,
  };
}
