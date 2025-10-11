import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";

type InternalConvexClient = ConvexHttpClient & {
  setAdminAuth(key: string): void;
  mutation<Args extends Record<string, unknown>, Return>(
    reference: FunctionReference<"mutation", "public" | "internal", Args, Return>,
    args: Args,
  ): Promise<Return>;
};

let adminClient: InternalConvexClient | null = null;

export function createConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(url);
}

export function getConvexAdminClient(): InternalConvexClient {
  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const adminKey = process.env.CONVEX_ADMIN_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }

  if (!adminKey) {
    throw new Error("CONVEX_ADMIN_KEY is not configured");
  }

  adminClient = new ConvexHttpClient(url, { skipConvexDeploymentUrlCheck: true }) as InternalConvexClient;
  adminClient.setAdminAuth(adminKey);

  return adminClient;
}
