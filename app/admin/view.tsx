"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { planOrder, subscriptionPlans } from "@/lib/subscription-plans";
import type { PlanId } from "@/lib/subscription-plans";

type UserOrganizationSummary = {
  organizationId: Id<"organizations">;
  organizationName: string | null;
  organizationSlug: string | null;
  role: "owner" | "admin" | "member";
};

function formatDate(value: number | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function formatBillingStatus(status: string | null | undefined) {
  switch (status) {
    case "trialing":
      return "Trialing";
    case "trial_expired":
      return "Trial Expired";
    case "canceled":
      return "Canceled";
    case "active":
    default:
      return "Active";
  }
}

function getUserOrganizations(user: unknown): UserOrganizationSummary[] {
  if (!user || typeof user !== "object") {
    return [];
  }

  const organizations = (user as { organizations?: UserOrganizationSummary[] }).organizations;
  if (!Array.isArray(organizations)) {
    return [];
  }

  return organizations;
}

export default function AdminView() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const currentUserId = session?.user?.id as Id<"users"> | undefined;
  const isSuperAdmin = session?.user?.superRole === "super_admin";

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!isSuperAdmin) {
      router.replace("/");
    }
  }, [status, isSuperAdmin, router]);

  const organizations = useQuery(
    api.admin.getAllOrganizations,
    isSuperAdmin && currentUserId ? { userId: currentUserId } : "skip"
  );

  const users = useQuery(
    api.admin.getAllUsers,
    isSuperAdmin && currentUserId ? { userId: currentUserId } : "skip"
  );

  const setSuperRole = useMutation(api.admin.setSuperRole);
  const deleteOrganization = useMutation(api.admin.deleteOrganization);
  const deleteUser = useMutation(api.admin.deleteUser);
  const updateOrganizationPlan = useMutation(api.subscriptions.updateOrganizationPlan);
  const downgradeOrganizationPlan = useMutation(api.subscriptions.downgradeToFree);

  const waitlistUsers = useQuery(
    api.waitlist.getWaitlistUsers,
    isSuperAdmin && currentUserId ? { userId: currentUserId } : "skip"
  );
  const waitlistStats = useQuery(
    api.waitlist.getWaitlistStats,
    isSuperAdmin && currentUserId ? { userId: currentUserId } : "skip"
  );
  const isWaitlistEnabled = useQuery(api.settings.isWaitlistEnabled);
  const approveWaitlistUser = useMutation(api.waitlist.approveWaitlistUser);
  const rejectWaitlistUser = useMutation(api.waitlist.rejectWaitlistUser);
  const toggleWaitlist = useMutation(api.settings.toggleWaitlist);

  const [pendingPlanIds, setPendingPlanIds] = useState<Record<string, boolean>>({});

  const planOptions = useMemo(() => planOrder.map((id) => subscriptionPlans[id]), []);

  const stats = useMemo(() => {
    const totalOrganizations = Array.isArray(organizations) ? organizations.length : "-";
    const totalUsers = Array.isArray(users) ? users.length : "-";

    const membersCount = Array.isArray(organizations)
      ? organizations.reduce((acc, org) => acc + (org.membersCount ?? 0), 0)
      : "-";

    return {
      totalOrganizations,
      totalUsers,
      membersCount,
    };
  }, [organizations, users]);

  if (!isSuperAdmin) {
    return null;
  }

  const isLoading = organizations === undefined || users === undefined;

  const handleToggleSuperAdmin = async (
    targetUserId: Id<"users">,
    currentlySuper: boolean
  ) => {
    if (!currentUserId) {
      return;
    }

    if (targetUserId === currentUserId && currentlySuper) {
      toast.error("You cannot revoke your own super admin access");
      return;
    }

    const payload: {
      userId: Id<"users">;
      targetUserId: Id<"users">;
      superRole?: "super_admin";
    } = {
      userId: currentUserId,
      targetUserId,
    };

    if (!currentlySuper) {
      payload.superRole = "super_admin";
    }

    try {
      await setSuperRole(payload);
      toast.success(
        currentlySuper ? "Super admin access revoked" : "Super admin access granted"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    }
  };

  const handleDeleteOrganization = async (organizationId: Id<"organizations">, organizationName: string) => {
    if (!currentUserId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete the organization "${organizationName}"? This removes all memberships and users who no longer belong anywhere. This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteOrganization({ userId: currentUserId, organizationId });
      toast.success(`Organization "${organizationName}" deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete organization");
    }
  };

  const handleDeleteUser = async (
    targetUserId: Id<"users">,
    email: string,
    isTargetSuper: boolean
  ) => {
    if (!currentUserId) {
      return;
    }

    if (isTargetSuper) {
      toast.error("Super admin accounts cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Delete the user ${email}? This removes their account and all related memberships.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteUser({ userId: currentUserId, targetUserId });
      toast.success(`User ${email} deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    }
  };

  const handlePlanChange = async (
    organizationId: Id<"organizations">,
    nextPlanId: PlanId,
    currentPlanId: PlanId
  ) => {
    if (!currentUserId) {
      toast.error("You must be signed in to update plans");
      return;
    }

    if (nextPlanId === currentPlanId) {
      return;
    }

    const key = organizationId as string;
    setPendingPlanIds((prev) => ({ ...prev, [key]: true }));

    try {
      if (nextPlanId === "free") {
        await downgradeOrganizationPlan({ organizationId, userId: currentUserId });
      } else {
        await updateOrganizationPlan({ organizationId, userId: currentUserId, planId: nextPlanId });
      }
      const planName = subscriptionPlans[nextPlanId]?.name ?? nextPlanId;
      toast.success(`Plan updated to ${planName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update plan");
    } finally {
      setPendingPlanIds((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleApproveWaitlist = async (targetUserId: Id<"users">, email: string) => {
    if (!currentUserId) {
      return;
    }

    try {
      await approveWaitlistUser({ userId: currentUserId, targetUserId });
      toast.success(`${email} has been approved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve user");
    }
  };

  const handleRejectWaitlist = async (targetUserId: Id<"users">, email: string) => {
    if (!currentUserId) {
      return;
    }

    const confirmed = window.confirm(
      `Reject ${email} from the waitlist? They will not be able to access the platform.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await rejectWaitlistUser({ userId: currentUserId, targetUserId });
      toast.success(`${email} has been rejected`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject user");
    }
  };

  const handleToggleWaitlist = async () => {
    if (!currentUserId) {
      return;
    }

    const newValue = !isWaitlistEnabled;
    const action = newValue ? "enable" : "disable";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} the waitlist feature?\n\n${
        newValue
          ? "New users will be added to waitlist and require approval."
          : "New users will be able to access the platform immediately."
      }`
    );

    if (!confirmed) {
      return;
    }

    try {
      await toggleWaitlist({ userId: currentUserId, enabled: newValue });
      toast.success(`Waitlist ${newValue ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle waitlist");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="text-muted-foreground">
            Manage all organizations and users across the platform.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Organizations</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {stats.totalOrganizations}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{stats.totalUsers}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Members</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{stats.membersCount}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Waitlist Settings</CardTitle>
              </div>
              <Button
                variant={isWaitlistEnabled ? "destructive" : "default"}
                onClick={handleToggleWaitlist}
              >
                {isWaitlistEnabled ? "Disable Waitlist" : "Enable Waitlist"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-2xl font-semibold">
                    {isWaitlistEnabled ? (
                      <Badge variant="default">Enabled</Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-semibold">{waitlistStats?.pending ?? "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-semibold">{waitlistStats?.approved ?? "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-semibold">{waitlistStats?.rejected ?? "-"}</p>
                </div>
              </div>
            </div>

            {Array.isArray(waitlistUsers) && waitlistUsers.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-4 text-lg font-semibold">Pending Approvals</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waitlistUsers.map((user) => (
                          <TableRow key={user._id}>
                            <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(user.waitlistRequestedAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() =>
                                    handleApproveWaitlist(user._id as Id<"users">, user.email)
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleRejectWaitlist(user._id as Id<"users">, user.email)
                                  }
                                >
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}

            {(!waitlistUsers || waitlistUsers.length === 0) && (
              <p className="text-sm text-muted-foreground">No users in waitlist.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-sm text-muted-foreground">Loading organizations...</p>}
            {!isLoading && Array.isArray(organizations) && organizations.length === 0 && (
              <p className="text-sm text-muted-foreground">No organizations found.</p>
            )}
            {!isLoading && Array.isArray(organizations) && organizations.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => {
                      const planId = (org.planId ?? "free") as PlanId;
                      const organizationKey = org._id as string;
                      const isPlanUpdating = Boolean(pendingPlanIds[organizationKey]);

                      return (
                        <TableRow key={org._id}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell className="text-muted-foreground">{org.slug}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <Select
                                value={planId}
                                disabled={isPlanUpdating}
                                onValueChange={(value) =>
                                  handlePlanChange(
                                    org._id as Id<"organizations">,
                                    value as PlanId,
                                    planId
                                  )
                                }
                              >
                                <SelectTrigger size="sm" className="min-w-[160px]">
                                  <SelectValue placeholder="Select plan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {planOptions.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                      <span className="flex w-full items-center justify-between gap-2">
                                        <span>{plan.name}</span>
                                        <span className="text-xs text-muted-foreground">{plan.price}</span>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="uppercase">
                                  {planId}
                                </Badge>
                                <Badge variant="secondary">
                                  {formatBillingStatus(org.billingStatus)}
                                </Badge>
                                {isPlanUpdating && (
                                  <Badge variant="outline">Updating…</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{org.membersCount ?? 0}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(org.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteOrganization(org._id, org.name)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-sm text-muted-foreground">Loading users...</p>}
            {!isLoading && Array.isArray(users) && users.length === 0 && (
              <p className="text-sm text-muted-foreground">No users found.</p>
            )}
            {!isLoading && Array.isArray(users) && users.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Workspaces</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const isTargetSuper = user.superRole === "super_admin";
                      const userOrganizations = getUserOrganizations(user);
                      return (
                        <TableRow key={user._id}>
                          <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            {userOrganizations.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {userOrganizations.map((membership) => {
                                  const label =
                                    membership.organizationName ??
                                    membership.organizationSlug ??
                                    membership.organizationId;
                                  const displayText = `${label} (${membership.role})`;
                                  return (
                                    <Badge
                                      key={`${membership.organizationId}-${membership.role}`}
                                      variant="outline"
                                    >
                                      {displayText}
                                    </Badge>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No workspace</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isTargetSuper ? (
                              <Badge variant="default">Super Admin</Badge>
                            ) : (
                              <Badge variant="outline">User</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleToggleSuperAdmin(user._id as Id<"users">, isTargetSuper)
                                }
                                disabled={user._id === currentUserId && isTargetSuper}
                              >
                                {isTargetSuper ? "Revoke" : "Grant"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleDeleteUser(user._id as Id<"users">, user.email, isTargetSuper)
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground">
          All actions are logged. Use this console responsibly when assisting customers.
        </p>
      </div>
    </div>
  );
}
