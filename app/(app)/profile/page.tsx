"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@/contexts/organization-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Loader2, Shield, Users } from "lucide-react";
import { toast } from "sonner";

type ProfileOrganization = {
  organizationId: Id<"organizations">;
  organizationName: string;
  organizationSlug: string;
  role: "owner" | "admin" | "member";
  joinedAt: number;
  membersCount: number;
  planId: string;
  planName: string;
  billingStatus: "trialing" | "active" | "trial_expired" | "canceled";
  subscriptionProvider: string | null;
  trialEndsAt: number | null;
};

type ProfileResponse = {
  user: {
    _id: Id<"users">;
    email: string;
    name?: string | null;
    image?: string | null;
    emailVerified?: number | null;
    superRole?: "super_admin" | undefined;
  };
  organizations: ProfileOrganization[];
  metadata: {
    firstJoinedAt: number | null;
    totalOrganizations: number;
    ownedOrganizations: number;
  };
};

function formatDate(value: number | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString();
}

function formatDurationFrom(timestamp: number | null | undefined) {
  if (!timestamp) {
    return "—";
  }
  const now = Date.now();
  const diffMs = now - timestamp;
  if (diffMs <= 0) {
    return "Just joined";
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    return hours <= 1 ? "About an hour" : `${hours} hours`;
  }
  if (diffDays < 30) {
    return diffDays === 1 ? "1 day" : `${diffDays} days`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return diffMonths === 1 ? "1 month" : `${diffMonths} months`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return diffYears === 1 ? "1 year" : `${diffYears} years`;
}

function getInitials(name: string | null | undefined, email: string | undefined) {
  const source = name || email || "User";
  return source
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getBillingLabel(status: ProfileOrganization["billingStatus"]) {
  switch (status) {
    case "trialing":
      return "Trialing";
    case "trial_expired":
      return "Trial expired";
    case "canceled":
      return "Canceled";
    case "active":
    default:
      return "Active";
  }
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { switchOrganization } = useOrganization();
  const currentUserId = session?.user?.id as Id<"users"> | undefined;

  const profile = useQuery(
    api.profile.getUserProfile,
    currentUserId ? { userId: currentUserId } : "skip"
  ) as ProfileResponse | null | undefined;

  const deleteAccountMutation = useMutation(api.profile.deleteAccount);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const isLoading = status === "loading" || (currentUserId && profile === undefined);
  const userProfile = profile ?? null;

  const organizations = userProfile?.organizations ?? [];

  const displayName = userProfile?.user.name ?? userProfile?.user.email ?? "Your account";
  const displayEmail = userProfile?.user.email ?? "—";
  const fallbackEmail = displayEmail === "—" ? undefined : displayEmail;

  const stats = useMemo(() => {
    if (!userProfile) {
      return {
        totalOrganizations: 0,
        ownedOrganizations: 0,
        memberDuration: "—",
      };
    }

    return {
      totalOrganizations: userProfile.metadata.totalOrganizations,
      ownedOrganizations: userProfile.metadata.ownedOrganizations,
      memberDuration: formatDurationFrom(userProfile.metadata.firstJoinedAt),
    };
  }, [userProfile]);

  const isSuperAdmin = userProfile?.user.superRole === "super_admin";

  const initials = getInitials(userProfile?.user.name ?? displayName, fallbackEmail);

  const canDeleteAccount =
    Boolean(userProfile) &&
    (isSuperAdmin || organizations.some((org) => org.role === "owner" || org.role === "admin"));

  const handleDeleteAccount = async () => {
    if (!currentUserId) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteAccountMutation({ userId: currentUserId });
      toast.success("Your account has been deleted");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("currentOrganizationId");
      }
      setIsDeleteDialogOpen(false);
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete account";
      toast.error(message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!isLoading && !userProfile) {
    return (
      <div className="flex h-full flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 md:px-6 lg:px-8">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Profile</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile unavailable</CardTitle>
              <CardDescription>
                We couldn&apos;t load your account details. Try refreshing the page or reach out to support if the issue persists.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4 md:px-6 lg:px-8">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              {isLoading ? (
                <Skeleton className="h-16 w-16 rounded-full" />
              ) : (
                <Avatar className="h-16 w-16">
                  <AvatarImage src={userProfile?.user.image ?? undefined} alt={userProfile?.user.name ?? ""} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              )}
              <div className="space-y-1">
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-40" />
                  </>
                ) : (
                  <>
                    <CardTitle className="text-2xl font-semibold">
                      {displayName}
                    </CardTitle>
                    <CardDescription>{displayEmail}</CardDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {isSuperAdmin && <Badge variant="default">Super admin</Badge>}
                    </div>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" />
                  <div>
                    <p className="font-medium text-foreground">Member since</p>
                    <p>{userProfile ? formatDate(userProfile.metadata.firstJoinedAt) : "—"}</p>
                    <p className="text-xs">{stats.memberDuration !== "—" ? `${stats.memberDuration} on the platform` : " "}</p>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Shield className="size-4" />
                    <div>
                      <p className="font-medium text-foreground">Platform access</p>
                      <p>You can manage all organizations as a super admin.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workspace summary</CardTitle>
              <CardDescription>
                Overview of the organizations you belong to.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Total workspaces</p>
                    <p className="text-2xl font-semibold">{stats.totalOrganizations}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Owned</p>
                    <p className="text-2xl font-semibold">{stats.ownedOrganizations}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Member for</p>
                    <p className="text-2xl font-semibold">{stats.memberDuration}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your workspaces</CardTitle>
            <CardDescription>
              Role, plan, and membership information for every workspace you have access to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You are not a member of any workspace yet. Create or join an organization to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.organizationId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="size-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium">{org.organizationName}</span>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{org.organizationSlug}</span>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto px-0 text-xs"
                                  onClick={() => {
                                    switchOrganization(org.organizationId);
                                    router.push("/");
                                  }}
                                >
                                  Open
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">
                            {org.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary">{org.planName}</Badge>
                            {org.subscriptionProvider && (
                              <span className="text-xs text-muted-foreground">
                                Billing via {org.subscriptionProvider}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getBillingLabel(org.billingStatus)}</Badge>
                          {org.trialEndsAt && org.billingStatus === "trialing" && (
                            <p className="text-xs text-muted-foreground">
                              Trial ends {formatDate(org.trialEndsAt)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>{org.membersCount}</TableCell>
                        <TableCell>{formatDate(org.joinedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {canDeleteAccount && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle>Delete account</CardTitle>
              <CardDescription>
                Permanently remove your user profile, memberships, and any organizations you solely own. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Deleting your account will cancel active workspace plans you solely manage, remove all associated data, and sign you out of the platform.
                </p>
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={!canDeleteAccount || isLoading || isDeletingAccount}
                    >
                      Delete account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete account?</DialogTitle>
                      <DialogDescription>
                        This will permanently remove your user account, cancel any subscriptions you manage, and delete related workspace data. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteDialogOpen(false)}
                        disabled={isDeletingAccount}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                      >
                        {isDeletingAccount && <Loader2 className="mr-2 size-4 animate-spin" />}
                        Delete permanently
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
