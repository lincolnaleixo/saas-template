"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function WaitlistGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const userId = session?.user?.id as Id<"users"> | undefined;

  // Skip waitlist check for login, invite, and waitlist pages
  const isPublicPage = pathname === "/login" || pathname.startsWith("/invite") || pathname === "/waitlist";

  const waitlistStatus = useQuery(
    api.waitlist.getMyWaitlistStatus,
    userId && !isPublicPage && status === "authenticated" ? { userId } : "skip"
  );

  useEffect(() => {
    // Don't check waitlist on public pages
    if (isPublicPage) {
      return;
    }

    // Don't redirect while loading or unauthenticated
    if (status === "loading" || status === "unauthenticated") {
      return;
    }

    // Only redirect if user is explicitly in waitlist (pending or rejected)
    // If waitlistStatus is null/undefined, user is approved or never had waitlist
    if (waitlistStatus?.status === "pending" || waitlistStatus?.status === "rejected") {
      router.push("/waitlist");
    }
  }, [status, waitlistStatus, pathname, router, isPublicPage]);

  // Don't show loading on public pages
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Don't show loading if unauthenticated (let middleware handle redirect)
  if (status === "unauthenticated") {
    return <>{children}</>;
  }

  // Only show loading if we're actively fetching waitlist status for an authenticated user
  // Don't block if waitlist query is skipped or if status check is complete
  const shouldShowLoading = status === "authenticated" && userId && waitlistStatus === undefined;

  if (shouldShowLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user is in waitlist, show redirecting message
  if (
    waitlistStatus?.status === "pending" || waitlistStatus?.status === "rejected"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting to waitlist...</div>
      </div>
    );
  }

  // User is approved or has no waitlist status - allow access
  return <>{children}</>;
}
