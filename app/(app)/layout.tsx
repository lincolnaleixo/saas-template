"use client"

import { AppSidebar } from "@/components/app-sidebar";
import { NavigationOverlay, NavigationProgressProvider } from "@/components/navigation-progress";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavigationProgressProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <NavigationOverlay />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </NavigationProgressProvider>
  );
}
