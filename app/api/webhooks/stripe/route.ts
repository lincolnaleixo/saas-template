import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { Id } from "@/convex/_generated/dataModel";
import { internal } from "@/convex/_generated/api";
import { findPlanByStripePriceId, getDefaultPlan, isPlanId } from "@/lib/subscription-plans";
import { getConvexAdminClient } from "@/lib/convex-server";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

function toMs(value: number | null | undefined): number | undefined {
  return value ? value * 1000 : undefined;
}

function extractOrganizationId(subscription: Stripe.Subscription | Stripe.Checkout.Session): string | null {
  const metadata = subscription.metadata || {};
  return metadata.organizationId ?? null;
}

function extractPlanId(
  subscription: Stripe.Subscription,
  fallback: string | null
): string {
  const metadataPlan = subscription.metadata?.planId;
  if (metadataPlan && isPlanId(metadataPlan)) {
    return metadataPlan;
  }

  const price = subscription.items.data[0]?.price?.id;
  const mappedPlan = findPlanByStripePriceId(price ?? null);
  if (mappedPlan) {
    return mappedPlan;
  }

  if (fallback && isPlanId(fallback)) {
    return fallback;
  }

  return getDefaultPlan();
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const organizationId = extractOrganizationId(subscription);
  if (!organizationId) {
    console.warn("Stripe subscription is missing organization metadata", subscription.id);
    return;
  }

  const planId = extractPlanId(subscription, subscription.metadata?.planId ?? null);

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;

  const priceId = subscription.items.data[0]?.price?.id;
  const currentPeriodEndRaw = (subscription as Stripe.Subscription & { current_period_end?: number | null }).current_period_end ?? null;

  const convex = getConvexAdminClient();

  await convex.mutation(internal.subscriptions.syncSubscriptionFromStripe, {
    organizationId: organizationId as Id<"organizations">,
    planId,
    subscriptionId: subscription.id,
    subscriptionCustomerId: customerId ?? undefined,
    subscriptionPriceId: priceId ?? undefined,
    status: subscription.status,
    cancelAt: toMs(subscription.cancel_at ?? undefined),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? undefined,
    currentPeriodEnd: toMs(currentPeriodEndRaw ?? undefined),
    trialStart: toMs(subscription.trial_start ?? undefined),
    trialEnd: toMs(subscription.trial_end ?? undefined),
  });
}

async function handleSubscriptionDeletion(subscription: Stripe.Subscription) {
  const organizationId = extractOrganizationId(subscription);
  if (!organizationId) {
    console.warn("Stripe subscription deletion missing organization metadata", subscription.id);
    return;
  }

  const convex = getConvexAdminClient();
  const currentPeriodEndRaw = (subscription as Stripe.Subscription & { current_period_end?: number | null }).current_period_end ?? null;

  await convex.mutation(internal.subscriptions.syncSubscriptionFromStripe, {
    organizationId: organizationId as Id<"organizations">,
    planId: getDefaultPlan(),
    status: subscription.status ?? "canceled",
    subscriptionId: undefined,
    subscriptionCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id,
    subscriptionPriceId: undefined,
    cancelAt: toMs(subscription.ended_at ?? undefined),
    cancelAtPeriodEnd: false,
    currentPeriodEnd: toMs(currentPeriodEndRaw ?? undefined),
    trialStart: toMs(subscription.trial_start ?? undefined),
    trialEnd: toMs(subscription.trial_end ?? undefined),
  });
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  const headerList = await headers();
  const signature = headerList.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const payload = await request.text();

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionEvent(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeletion(subscription);
        break;
      }
      case "checkout.session.completed": {
        const sessionObject = event.data.object as Stripe.Checkout.Session;
        if (sessionObject.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof sessionObject.subscription === "string"
              ? sessionObject.subscription
              : sessionObject.subscription.id,
            {
              expand: ["items.data.price"],
            }
          );
          await handleSubscriptionEvent(subscription);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`Failed to process Stripe webhook event ${event.type}`, error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
