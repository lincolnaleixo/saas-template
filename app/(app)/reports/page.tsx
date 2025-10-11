"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PermissionGuard } from "@/components/permission-guard";

export default function ReportsPage() {
  return (
    <PermissionGuard page="reports">
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
                <BreadcrumbPage>Reports</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <div className="w-full space-y-6">
          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>MRR Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Current monthly recurring revenue: <span className="font-medium text-foreground">$42,700</span></p>
                <p>Change since last month: <span className="text-green-600">+8.4%</span></p>
                <p>Top growth segment: Mid-market</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Active Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Total active customers: <span className="font-medium text-foreground">187</span></p>
                <p>Recently churned: 6 (past 30 days)</p>
                <p>New trials converted this week: 12</p>
              </CardContent>
            </Card>
          </section>
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  • Pipeline velocity is up as the new onboarding email experiment drove
                  a 15% lift in trial completions.
                </p>
                <p>
                  • Expansion revenue continues to be strongest in the analytics add-on;
                  consider bundling it with enterprise plans.
                </p>
                <p>
                  • Support response times improved to under 2 hours after the help center refresh.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </PermissionGuard>
  );
}
