"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { Clock, CheckCircle2, XCircle, Mail } from "lucide-react";

export default function WaitlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user?.id as Id<"users"> | undefined;

  const waitlistStatus = useQuery(
    api.waitlist.getMyWaitlistStatus,
    userId ? { userId } : "skip"
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // If user is approved or not in waitlist, redirect to home
    if (waitlistStatus?.status === "approved" || waitlistStatus?.status === undefined) {
      router.push("/");
    }
  }, [status, waitlistStatus, router]);

  if (status === "loading" || !waitlistStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isRejected = waitlistStatus.status === "rejected";
  const isPending = waitlistStatus.status === "pending";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {isPending && <Clock className="h-8 w-8 text-primary" />}
            {isRejected && <XCircle className="h-8 w-8 text-destructive" />}
          </div>
          <CardTitle className="text-2xl">
            {isPending && "You're on the Waitlist!"}
            {isRejected && "Access Not Available"}
          </CardTitle>
          <CardDescription>
            {isPending && "We're excited to have you join us soon"}
            {isRejected && "Your waitlist request was not approved"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPending && (
            <>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="mb-2 font-medium">What happens next?</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Our team is reviewing your request</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>You'll receive an email when you're approved</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Once approved, you can access all features</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                  <p className="font-medium text-primary">We're launching soon!</p>
                  <p className="mt-1 text-muted-foreground">
                    We're currently in private beta and onboarding users carefully to ensure the
                    best possible experience. Thank you for your patience!
                  </p>
                </div>

                {waitlistStatus.requestedAt && (
                  <div className="text-center text-xs text-muted-foreground">
                    Joined waitlist on{" "}
                    {new Date(waitlistStatus.requestedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {isRejected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p>
                  We're currently unable to provide access at this time. If you believe this is an
                  error, please contact our support team.
                </p>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
