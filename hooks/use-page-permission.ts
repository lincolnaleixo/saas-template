"use client";

import { useQuery } from "convex/react";
import { useSession } from "next-auth/react";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@/contexts/organization-context";
import type { Id } from "@/convex/_generated/dataModel";
import { useSubscription } from "./use-subscription";

type PageType = "dashboard" | "analytics" | "reports" | "projects" | "team";

export function usePagePermission(page: PageType) {
  const { data: session, status } = useSession();
  const { currentOrganization } = useOrganization();

  const userId = session?.user?.id as Id<"users"> | undefined;
  const organizationId = currentOrganization?._id;
  const isSuperAdmin = session?.user?.superRole === "super_admin";

  const { subscription, isLoading: subscriptionLoading } = useSubscription();

  const fullAccess = {
    dashboard: true,
    analytics: true,
    reports: true,
    projects: true,
    team: true,
  };

  const shouldQueryPermissions = Boolean(!isSuperAdmin && userId && organizationId);
  const permissions = useQuery(
    api.permissions.getUserPagePermissions,
    shouldQueryPermissions
      ? { organizationId: organizationId as Id<"organizations">, userId: userId as Id<"users"> }
      : "skip"
  );

  const planAllows = subscription ? subscription.features[page] : true;

  const permissionsLoading = shouldQueryPermissions && permissions === undefined;
  const isLoading = status === "loading" || permissionsLoading || subscriptionLoading;
  const permissionAccess = permissions
    ? permissions[page]
    : shouldQueryPermissions
    ? false
    : true;
  const hasAccess = planAllows && permissionAccess;

  if (isSuperAdmin) {
    return {
      hasAccess: true,
      isLoading: false,
      permissions: fullAccess,
      planAllows: true,
      subscription,
      sessionStatus: status as "loading" | "authenticated" | "unauthenticated",
    };
  }

  return {
    hasAccess,
    isLoading,
    permissions,
    planAllows,
    subscription,
    sessionStatus: status as "loading" | "authenticated" | "unauthenticated",
  };
}
