import Stripe from "stripe";

const apiVersion: Stripe.StripeConfig["apiVersion"] = "2025-09-30.clover";

let stripeClient: Stripe | null = null;
let cachedAutomaticTax: boolean | null = null;

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, { apiVersion });
  }

  return stripeClient;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return secret;
}

export function isAutomaticTaxEnabled(): boolean {
  if (cachedAutomaticTax !== null) {
    return cachedAutomaticTax;
  }

  const rawValue = process.env.STRIPE_AUTOMATIC_TAX_ENABLED;
  cachedAutomaticTax = rawValue === "true";
  return cachedAutomaticTax;
}

export function isStripeError(error: unknown): error is Stripe.errors.StripeError {
  return error instanceof Stripe.errors.StripeError;
}
