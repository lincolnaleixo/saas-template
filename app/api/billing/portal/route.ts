import { NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth";
import { createConvexClient } from "@/lib/convex-server";
import { getStripeClient, isStripeError } from "@/lib/stripe";
import { resolveRequestBaseUrl } from "@/lib/env";

interface PortalRequest {
  organizationId: string;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = (await request.json()) as PortalRequest;

    if (!organizationId) {
      return NextResponse.json({ error: "Missing organization" }, { status: 400 });
    }

    const convex = createConvexClient();

    const organization = await convex.query(api.subscriptions.getOrganizationBillingContext, {
      organizationId: organizationId as Id<"organizations">,
      userId: session.user.id as Id<"users">,
    });

    if (!organization.subscriptionCustomerId) {
      return NextResponse.json({ error: "No Stripe customer configured" }, { status: 400 });
    }

    const stripe = getStripeClient();
    const baseUrl = resolveRequestBaseUrl(request);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: organization.subscriptionCustomerId,
      return_url: `${baseUrl}/billing`,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });
  } catch (error) {
    console.error("Failed to create Stripe Billing Portal session", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = isStripeError(error)
      ? error.statusCode ?? 400
      : /only workspace admins/i.test(message)
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
