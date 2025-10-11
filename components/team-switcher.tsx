"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Building2 } from "lucide-react"
import { useOrganization } from "@/contexts/organization-context"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { currentOrganization, organizations, switchOrganization, isLoading } = useOrganization()

  const formatRole = (role: string | undefined) => {
    if (!role) return "";
    if (role === "super_admin") {
      return "Super admin";
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  if (isLoading && !currentOrganization) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse">
            <div className="bg-sidebar-primary/50 flex aspect-square size-8 items-center justify-center rounded-lg" />
            <div className="grid flex-1 gap-1">
              <div className="bg-sidebar-primary/50 h-4 w-24 rounded" />
              <div className="bg-sidebar-primary/30 h-3 w-16 rounded" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!currentOrganization) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{currentOrganization.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {formatRole(currentOrganization.role)}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {organizations.map((org, index) => (
              <DropdownMenuItem
                key={org._id}
                onClick={() => switchOrganization(org._id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Building2 className="size-3.5 shrink-0" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm">{org.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatRole(org.role)}
                  </span>
                </div>
                {index < 9 && <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Create organization</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
