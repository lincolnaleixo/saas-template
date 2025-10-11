import { NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth";
import { createConvexClient } from "@/lib/convex-server";
import { getStripeClient } from "@/lib/stripe";

type InvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "uncollectible"
  | "void"
  | "deleted"
  | "unpaid";

interface InvoiceResponse {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  created: number | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  billingPeriodEnd: number | null;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Missing organization" }, { status: 400 });
    }

    const convex = createConvexClient();

    const organization = await convex.query(api.subscriptions.getOrganizationBillingContext, {
      organizationId: organizationId as Id<"organizations">,
      userId: session.user.id as Id<"users">,
    });

    if (!organization.subscriptionCustomerId) {
      return NextResponse.json({ invoices: [] as InvoiceResponse[] }, { status: 200 });
    }

    const stripe = getStripeClient();
    const invoices = await stripe.invoices.list({
      customer: organization.subscriptionCustomerId,
      limit: 12,
      expand: ["data.charge"],
    });

    const response: InvoiceResponse[] = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number ?? invoice.id,
      status: (invoice.status ?? "open") as InvoiceStatus,
      total: invoice.total ?? 0,
      currency: invoice.currency ?? "usd",
      created: invoice.created ?? null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
      billingPeriodEnd: invoice.lines?.data?.[0]?.period?.end ?? null,
    }));

    return NextResponse.json({ invoices: response }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch Stripe invoices", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
