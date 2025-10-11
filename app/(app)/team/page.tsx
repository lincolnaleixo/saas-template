"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSession } from "next-auth/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@/contexts/organization-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PermissionsManager } from "@/components/permissions-manager";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Trash2, RefreshCw, Users, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/permission-guard";

type OrganizationMember = {
  _id: Id<"users">;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "owner" | "admin" | "member";
  joinedAt?: number;
};

type OrganizationInvitation = {
  _id: Id<"invitations">;
  email: string;
  role: string;
  inviterName?: string | null;
  status?: string;
  token: string;
};

export default function TeamPage() {
  const { data: session } = useSession();
  const { currentOrganization, isLoading: organizationsLoading } = useOrganization();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const organizationId = currentOrganization?._id;
  const hasOrganization = Boolean(organizationId);
  const currentUserId = session?.user?.id as Id<"users"> | undefined;
  const isSuperAdmin = session?.user?.superRole === "super_admin";

  const members = useQuery(
    api.auth.getOrganizationMembers,
    organizationId ? { organizationId } : "skip"
  );

  const invitations = useQuery(
    api.invitations.getOrganizationInvitations,
    organizationId ? { organizationId } : "skip"
  );

  const memberList = useMemo(
    () => (members ?? []) as OrganizationMember[],
    [members]
  );
  const invitationList = useMemo(
    () => (invitations ?? []) as OrganizationInvitation[],
    [invitations]
  );

  const isMembersLoading = organizationsLoading || (hasOrganization && members === undefined);
  const isInvitationsLoading =
    organizationsLoading || (hasOrganization && invitations === undefined);

  const currentMember = useMemo(() => {
    if (!currentUserId) {
      return null;
    }
    return memberList.find((member) => member._id === currentUserId) ?? null;
  }, [memberList, currentUserId]);

  const currentUserRole = currentMember?.role ?? null;
  const isOwnerOrAdmin =
    isSuperAdmin || currentUserRole === "owner" || currentUserRole === "admin";

  const showMembersEmptyState = hasOrganization && !isMembersLoading && memberList.length === 0;
  const showNoOrganizationState = !organizationsLoading && !hasOrganization;

  const showInvitationsEmptyState =
    isOwnerOrAdmin && hasOrganization && !isInvitationsLoading && invitationList.length === 0;
  const shouldRenderInvitationsCard =
    isOwnerOrAdmin && (hasOrganization || isInvitationsLoading);

  const cancelInvitation = useMutation(api.invitations.cancelInvitation);
  const resendInvitation = useMutation(api.invitations.resendInvitation);
  const removeMember = useMutation(api.auth.removeOrganizationMember);

  const handleInvite = async () => {
    if (!email || !currentOrganization || !currentUserId) return;

    if (!isOwnerOrAdmin) {
      toast.error("You don't have permission to invite members");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: currentOrganization._id,
          email,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success("Invitation sent successfully!");
      setEmail("");
      setIsInviteDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send invitation";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInviteLink = async (token: string) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/invite/${token}`;

    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    toast.success("Invite link copied to clipboard!");

    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCancelInvite = async (invitationId: Id<"invitations">) => {
    if (!currentUserId || !isOwnerOrAdmin) {
      return;
    }
    try {
      await cancelInvitation({ invitationId, userId: currentUserId });
      toast.success("Invitation cancelled");
    } catch {
      toast.error("Failed to cancel invitation");
    }
  };

  const handleResendInvite = async (invitationId: Id<"invitations">) => {
    if (!currentUserId || !isOwnerOrAdmin) {
      return;
    }
    try {
      await resendInvitation({ invitationId, userId: currentUserId });
      toast.success("Invitation resent");
    } catch {
      toast.error("Failed to resend invitation");
    }
  };

  const handleRemoveMember = async () => {
    if (!organizationId || !currentUserId || !memberToRemove) {
      return;
    }

    if (!isOwnerOrAdmin) {
      return;
    }

    setIsRemovingMember(true);
    try {
      await removeMember({
        organizationId,
        userId: currentUserId,
        targetUserId: memberToRemove._id,
      });
      toast.success(`${memberToRemove.email ?? "Member"} removed from organization`);
      setMemberToRemove(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove member";
      toast.error(message);
    } finally {
      setIsRemovingMember(false);
    }
  };

  return (
    <PermissionGuard page="team">
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
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Team</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s team members and invitations
          </p>
        </div>
        {isOwnerOrAdmin ? (
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join {currentOrganization?.name ?? "this organization"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    value={role}
                    onValueChange={(value) =>
                      setRole(value as "admin" | "member")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={isLoading || !email || !organizationId}
                >
                  {isLoading ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <p className="text-sm text-muted-foreground">
            You need admin access to invite new members.
          </p>
        )}
      </div>

      <Card id="members">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Members ({memberList.length})
          </CardTitle>
          <CardDescription>People who have access to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isMembersLoading && (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`member-skeleton-${index}`}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </>
            )}

            {showNoOrganizationState && (
              <p className="text-sm text-muted-foreground">
                Join or create an organization to manage members.
              </p>
            )}

            {showMembersEmptyState && (
              <p className="text-sm text-muted-foreground">
                There are no members yet.
              </p>
            )}

            {!isMembersLoading && hasOrganization &&
              memberList.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.image ?? undefined} />
                      <AvatarFallback>
                        {member.name?.charAt(0) || member.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                    {isOwnerOrAdmin && currentUserId &&
                      member.role !== "owner" &&
                      member._id !== currentUserId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMemberToRemove(member)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {shouldRenderInvitationsCard && (
        <Card id="invitations">
          <CardHeader>
            <CardTitle>Pending Invitations ({invitationList.length})</CardTitle>
            <CardDescription>Invitations that haven&apos;t been accepted yet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isInvitationsLoading && (
                <>
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div
                      key={`invitation-skeleton-${index}`}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {showInvitationsEmptyState && (
                <p className="text-sm text-muted-foreground">
                  There are no pending invitations.
                </p>
              )}

              {!isInvitationsLoading && hasOrganization &&
                invitationList.map((invitation) => (
                  <div
                    key={invitation._id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{invitation.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {invitation.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Invited by {invitation.inviterName}
                        </span>
                        {invitation.status === "expired" && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyInviteLink(invitation.token)}
                      >
                        {copiedLink ? (
                          "Copied!"
                        ) : (
                          <>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Copy Link
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResendInvite(invitation._id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelInvite(invitation._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasOrganization && organizationId && currentUserId && isOwnerOrAdmin && (
        <PermissionsManager
          organizationId={organizationId}
          currentUserId={currentUserId}
        />
      )}
      {isOwnerOrAdmin && (
        <Dialog open={Boolean(memberToRemove)} onOpenChange={(open) => !open && !isRemovingMember && setMemberToRemove(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove member</DialogTitle>
              <DialogDescription>
                This will remove {memberToRemove?.email} from the organization. They will lose access to all
                pages and permissions.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemovingMember}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveMember}
                disabled={isRemovingMember}
              >
                {isRemovingMember ? "Removing..." : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
        </div>
      </div>
    </PermissionGuard>
  );
}
