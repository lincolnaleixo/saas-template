export type PageFeature = "dashboard" | "analytics" | "reports" | "projects" | "team";

export type PlanId = "free" | "pro" | "ultra";

type PriceInterval = "month" | "year";

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  description: string;
  price: string;
  priceInterval: PriceInterval;
  trialDays?: number;
  features: Record<PageFeature, boolean>;
  highlight?: boolean;
  stripe?: {
    /** Publishable price id for Stripe Checkout (NEXT_PUBLIC in env). */
    priceId?: string;
    /** Override interval reported by Stripe if it differs from display price. */
    interval?: PriceInterval;
  };
}

const STRIPE_PRICE_PRO = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? undefined;
const STRIPE_PRICE_ULTRA = process.env.NEXT_PUBLIC_STRIPE_PRICE_ULTRA ?? undefined;

export const subscriptionPlans: Record<PlanId, SubscriptionPlan> = {
  free: {
    id: "free",
    name: "Starter",
    description: "Core features for getting started with a workspace",
    price: "$0",
    priceInterval: "month",
    features: {
      dashboard: true,
      analytics: false,
      reports: false,
      projects: true,
      team: true,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Advanced features for growing teams",
    price: "$49",
    priceInterval: "month",
    trialDays: 14,
    features: {
      dashboard: true,
      analytics: false,
      reports: true,
      projects: true,
      team: true,
    },
    stripe: {
      priceId: STRIPE_PRICE_PRO,
      interval: "month",
    },
  },
  ultra: {
    id: "ultra",
    name: "Ultra",
    description: "Everything unlocked for enterprise teams",
    price: "$99",
    priceInterval: "month",
    trialDays: 14,
    features: {
      dashboard: true,
      analytics: true,
      reports: true,
      projects: true,
      team: true,
    },
    stripe: {
      priceId: STRIPE_PRICE_ULTRA,
      interval: "month",
    },
  },
};

export const planOrder: PlanId[] = ["free", "pro", "ultra"];

export function getPlan(planId: PlanId): SubscriptionPlan {
  return subscriptionPlans[planId];
}

export function getFeatureAccess(planId: PlanId): Record<PageFeature, boolean> {
  return subscriptionPlans[planId].features;
}

export function getDefaultPlan(): PlanId {
  return "free";
}

export function getTrialPlan(): PlanId {
  return "pro";
}

export function getTrialDurationMs(): number {
  const days = subscriptionPlans.pro.trialDays ?? 0;
  return days * 24 * 60 * 60 * 1000;
}

export function getStripePriceId(planId: PlanId): string | undefined {
  return subscriptionPlans[planId].stripe?.priceId;
}

export function findPlanByStripePriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) {
    return null;
  }

  return (planOrder.find((planId) => subscriptionPlans[planId].stripe?.priceId === priceId) ?? null);
}

export function isPlanId(value: string | null | undefined): value is PlanId {
  if (!value) {
    return false;
  }

  return planOrder.includes(value as PlanId);
}
