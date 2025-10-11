"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Building2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function InvitePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const invitation = useQuery(api.invitations.getInvitationByToken, { token });
  const acceptInvitation = useMutation(api.invitations.acceptInvitation);

  const organizationName =
    (invitation as (typeof invitation) & { organizationName?: string } | null)?.organizationName ??
    "your organization";
  const inviterName =
    (invitation as (typeof invitation) & { inviterName?: string } | null)?.inviterName ?? "Someone";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
    }
  }, [status, token, router]);

  const handleAccept = useCallback(async () => {
    if (!session?.user || !invitation) return;

    // Check if the logged-in user’s email matches the invitation email
    if (session.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      setError(
        `This invitation was sent to ${invitation.email}. Please log in with that email address or ask for a new invitation.`
      );
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      await acceptInvitation({
        token,
        userId: session.user.id as Id<"users">,
      });

      setSuccess(true);

      // Force a hard reload to refresh the organization context
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to accept invitation";
      setError(message);
      setIsAccepting(false);
    }
  }, [acceptInvitation, invitation, session, token]);

  useEffect(() => {
    if (
      session?.user &&
      invitation &&
      !invitation.isExpired &&
      invitation.status === "pending" &&
      !isAccepting &&
      !success &&
      !error
    ) {
      void handleAccept();
    }
  }, [session, invitation, isAccepting, success, error, handleAccept]);

  if (status === "loading" || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation link has expired. Please request a new invitation from the
              organization administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Welcome to {organizationName}!</CardTitle>
            <CardDescription>
              You’ve successfully joined the organization. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.push("/")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You’re Invited!</CardTitle>
          <CardDescription>
            {inviterName} has invited you to join{" "}
            <strong>{organizationName}</strong> as a{" "}
            <strong>{invitation.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAccepting ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Accepting invitation...</p>
            </div>
          ) : (
            <Button onClick={handleAccept} className="w-full" size="lg">
              Accept Invitation
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
