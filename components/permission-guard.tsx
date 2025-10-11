"use client";

import Link from "next/link";
import { ReactNode, useEffect } from "react";
import { usePagePermission } from "@/hooks/use-page-permission";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";

type PageType = "dashboard" | "analytics" | "reports" | "projects" | "team";

interface PermissionGuardProps {
  page: PageType;
  children: ReactNode;
}

export function PermissionGuard({ page, children }: PermissionGuardProps) {
  const permission = usePagePermission(page);
  const { hasAccess, isLoading, planAllows } = permission;
  const sessionStatus = permission.sessionStatus as "loading" | "authenticated" | "unauthenticated";
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const callbackUrl = `${pathname}${search}`;
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [sessionStatus, router, pathname]);

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              Log in to access your workspace dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    const planLimited = planAllows === false;
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              {planLimited
                ? "Your current plan doesn’t include this page. Upgrade in Billing to unlock it."
                : "You don’t have permission to access this page. Please contact your organization administrator to request access."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {planLimited
                ? "Only owners or admins can change plans in Settings → Billing."
                : "If you believe this is an error, please contact your administrator."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
