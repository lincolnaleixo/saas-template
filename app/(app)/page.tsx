"use client";

import { useSession } from "next-auth/react";
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
import { PermissionGuard } from "@/components/permission-guard";

export default function Page() {
  const { data: session } = useSession();
  const displayName = session?.user?.name || session?.user?.email || "there";

  return (
    <PermissionGuard page="dashboard">
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
                <BreadcrumbPage>Welcome</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <div className="w-full space-y-6">
          <section className="flex flex-col gap-6 rounded-lg border bg-background p-6 shadow-sm md:p-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Welcome back, {displayName} 👋
              </h1>
            </div>
            <p className="text-base text-muted-foreground">
              This template gives you a multi-tenant SaaS foundation with auth,
              Convex, and a responsive UI. Replace this message with your own
              onboarding experience, metrics, or quick links to help teams get
              started.
            </p>
            <p className="text-sm text-muted-foreground">
              Tip: update this page in `app/(app)/page.tsx` to showcase the most
              important actions or insights for your product.
            </p>
          </section>
        </div>
      </main>
    </PermissionGuard>
  );
}
