"use client"

import * as React from "react"
import { FileText, FolderKanban, LayoutDashboard, LineChart, Users, Shield, CreditCard } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import { useQuery } from "convex/react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useOrganization } from "@/contexts/organization-context"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useSubscription } from "@/hooks/use-subscription"

type PageKey = "dashboard" | "analytics" | "reports" | "projects" | "team"

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  page?: PageKey
  requiresOwnerOrAdmin?: boolean
}

const baseNavItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    page: "dashboard",
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: LineChart,
    page: "analytics",
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
    page: "reports",
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
    page: "projects",
  },
  {
    title: "Team",
    url: "/team",
    icon: Users,
    page: "team",
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const { currentOrganization } = useOrganization()

  const userId = session?.user?.id as Id<"users"> | undefined
  const organizationId = currentOrganization?._id
  const isSuperAdmin = session?.user?.superRole === "super_admin"
  const currentRole = currentOrganization?.role

  const { subscription, isLoading: subscriptionLoading } = useSubscription()

  const permissions = useQuery(
    api.permissions.getUserPagePermissions,
    !isSuperAdmin && userId && organizationId ? { userId, organizationId } : "skip"
  )

  const navItems = React.useMemo(() => {
    const items = [...baseNavItems]

    // Add Billing for owners and admins
    if (currentRole === "owner" || currentRole === "admin" || isSuperAdmin) {
      items.push({
        title: "Billing",
        url: "/billing",
        icon: CreditCard,
        requiresOwnerOrAdmin: true,
      })
    }

    if (isSuperAdmin) {
      items.push({
        title: "Admin",
        url: "/admin",
        icon: Shield,
      })
    }
    return items
  }, [isSuperAdmin, currentRole])

  const filteredNavItems = React.useMemo(() => {
    if (isSuperAdmin) {
      return navItems
    }

    if (permissions === undefined || subscriptionLoading) {
      return []
    }

    if (permissions === null) {
      return []
    }

    return navItems.filter((item) => {
      // Always show items without page restrictions (like Billing for owners/admins)
      if (!item.page) {
        return true
      }
      const planAllows = subscription ? subscription.features[item.page] : true
      return planAllows && (permissions[item.page] ?? false)
    })
  }, [permissions, navItems, isSuperAdmin, subscription, subscriptionLoading])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
