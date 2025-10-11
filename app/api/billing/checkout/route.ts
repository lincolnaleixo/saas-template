import { NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth";
import { createConvexClient } from "@/lib/convex-server";
import { getPlan, getStripePriceId, isPlanId } from "@/lib/subscription-plans";
import { getStripeClient, isAutomaticTaxEnabled, isStripeError } from "@/lib/stripe";
import { resolveRequestBaseUrl } from "@/lib/env";

interface CheckoutRequest {
  organizationId: string;
  planId: string;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: CheckoutRequest;
    try {
      body = (await request.json()) as CheckoutRequest;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { organizationId, planId } = body;

    if (!organizationId || !planId) {
      return NextResponse.json({ error: "Missing organization or plan" }, { status: 400 });
    }

    if (!isPlanId(planId)) {
      return NextResponse.json({ error: "Unsupported plan" }, { status: 400 });
    }

    const stripePriceId = getStripePriceId(planId);
    if (!stripePriceId) {
      return NextResponse.json({ error: "Stripe price is not configured for this plan" }, { status: 400 });
    }

    const convex = createConvexClient();

    const organization = await convex.query(api.subscriptions.getOrganizationBillingContext, {
      organizationId: organizationId as Id<"organizations">,
      userId: session.user.id as Id<"users">,
    });

    const stripe = getStripeClient();
    const plan = getPlan(planId);
    const baseUrl = resolveRequestBaseUrl(request);

    const metadata = {
      organizationId,
      planId,
    } satisfies Record<string, string>;

    const automaticTaxEnabled = isAutomaticTaxEnabled();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: organizationId,
      metadata,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata,
        trial_period_days: plan.trialDays ?? undefined,
      },
      customer: organization.subscriptionCustomerId ?? undefined,
      customer_email:
        organization.subscriptionCustomerId || !session.user.email
          ? undefined
          : session.user.email,
      success_url: `${baseUrl}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing`,
      allow_promotion_codes: true,
      ...(automaticTaxEnabled ? { automatic_tax: { enabled: true as const } } : {}),
    });

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  } catch (error) {
    console.error("Failed to create Stripe Checkout session", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = isStripeError(error)
      ? error.statusCode ?? 400
      : /only workspace admins/i.test(message)
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
