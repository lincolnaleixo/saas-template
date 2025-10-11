"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Shield,
  Lock,
  LayoutDashboard,
  BarChart3,
  FileText,
  Kanban,
  Users,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";

type PermissionsData = {
  userId: Id<"users">;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  role: "owner" | "admin" | "member";
  permissions: {
    dashboard: boolean;
    analytics: boolean;
    reports: boolean;
    projects: boolean;
    team: boolean;
  };
};

interface PermissionsManagerProps {
  organizationId: Id<"organizations">;
  currentUserId: Id<"users">;
}

type PageKey = keyof PermissionsData["permissions"];

const pageConfig: Record<
  PageKey,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    accent: string;
  }
> = {
  dashboard: {
    label: "Dashboard",
    description: "High-level health and KPIs",
    icon: LayoutDashboard,
    accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  analytics: {
    label: "Analytics",
    description: "Detailed performance insights",
    icon: BarChart3,
    accent: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  reports: {
    label: "Reports",
    description: "Automated exports and summaries",
    icon: FileText,
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  projects: {
    label: "Projects",
    description: "Manage workstreams & tasks",
    icon: Kanban,
    accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  team: {
    label: "Team",
    description: "Invite teammates and manage roles",
    icon: Users,
    accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
};

const permissionKeys = Object.keys(pageConfig) as PageKey[];

export function PermissionsManager({
  organizationId,
  currentUserId,
}: PermissionsManagerProps) {
  const [updatingUserId, setUpdatingUserId] = useState<Id<"users"> | null>(null);

  const permissionsData = useQuery(
    api.permissions.getOrganizationPagePermissions,
    { organizationId, userId: currentUserId }
  );

  const updatePermission = useMutation(api.permissions.updatePagePermission);

  const isLoading = permissionsData === undefined;
  const members = (permissionsData ?? []) as PermissionsData[];

  const { subscription } = useSubscription();

  const handleTogglePermission = async (
    targetUserId: Id<"users">,
    page: "dashboard" | "analytics" | "reports" | "projects" | "team",
    currentValue: boolean
  ) => {
    setUpdatingUserId(targetUserId);
    try {
      await updatePermission({
        organizationId,
        userId: currentUserId,
        targetUserId,
        page,
        canAccess: !currentValue,
      });
      toast.success("Permission updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update permission";
      toast.error(message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <Card id="permissions" className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Page Permissions
        </CardTitle>
        <CardDescription>
          Give teammates access to the areas they need while keeping sensitive
          work locked down.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={150}>
          <div className="space-y-6">
            {isLoading && (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`perm-skeleton-${index}`} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-32 w-full" />
                  </div>
                ))}
              </>
            )}

            {!isLoading && members.length === 0 && (
              <p className="text-sm text-muted-foreground">
                There are no members to manage permissions for just yet.
              </p>
            )}

            {!isLoading &&
              members.map((member) => {
                const isOwnerOrAdmin =
                  member.role === "owner" || member.role === "admin";
                const isUpdating = updatingUserId === member.userId;

                return (
                  <div
                    key={member.userId}
                    className={cn(
                      "rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm transition-colors",
                      "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.userImage ?? undefined} />
                          <AvatarFallback className="text-base font-medium">
                            {member.userName?.charAt(0) || member.userEmail?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-base font-semibold leading-tight">
                            {member.userName || member.userEmail}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.userEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        <Badge
                          variant={member.role === "owner" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {member.role}
                        </Badge>
                        {isUpdating && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Updating
                          </span>
                        )}
                      </div>
                    </div>

                    {isOwnerOrAdmin ? (
                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-foreground/20 bg-muted/40 p-3 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span>
                          {member.role === "owner" ? "Owners" : "Admins"} automatically
                          have access to every page.
                        </span>
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {permissionKeys.map((page) => {
                          const config = pageConfig[page];
                          const Icon = config.icon;
                          const planAllows = subscription
                            ? subscription.features[page as keyof typeof subscription.features]
                            : true;

                          const switchControl = (
                            <Switch
                              id={`${member.userId}-${page}`}
                              checked={member.permissions[page]}
                              onCheckedChange={() =>
                                handleTogglePermission(
                                  member.userId,
                                  page,
                                  member.permissions[page]
                                )
                              }
                              disabled={isUpdating || !planAllows}
                            />
                          );

                          return (
                            <div
                              key={page}
                              className={cn(
                                "group flex items-start gap-3 rounded-xl border border-border/60 bg-background/70 p-3 transition-all",
                                "hover:border-border hover:shadow-sm",
                                !planAllows && "opacity-60"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm",
                                  config.accent
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </span>

                              <div className="flex w-full items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <Label
                                    htmlFor={`${member.userId}-${page}`}
                                    className="cursor-pointer text-sm font-medium"
                                  >
                                    {config.label}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {config.description}
                                  </p>
                                  {!planAllows && (
                                    <Badge variant="outline" className="border-dashed text-[10px]">
                                      Upgrade to enable
                                    </Badge>
                                  )}
                                </div>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="mt-1 inline-flex">
                                      {switchControl}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    {planAllows
                                      ? `Toggle access to the ${config.label.toLowerCase()} area`
                                      : "This feature isn't available on the current plan"}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
