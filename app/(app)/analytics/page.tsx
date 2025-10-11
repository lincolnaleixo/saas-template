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

const sparklineValues = [34, 41, 39, 52, 61, 58, 72, 69, 75, 82];

export default function AnalyticsPage() {
  return (
    <PermissionGuard page="analytics">
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
                <BreadcrumbPage>Analytics</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <div className="w-full space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-4xl font-semibold text-foreground">12,418</p>
                <p className="mt-2">Rolling 7-day average across all workspaces.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Feature Adoption</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-4xl font-semibold text-foreground">63%</p>
                <p className="mt-2">Users who engaged with automations in the past month.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>NPS Trend</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-4xl font-semibold text-foreground">47</p>
                <p className="mt-2">Up 6 points since the latest onboarding improvements.</p>
              </CardContent>
            </Card>
          </section>
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Weekly Active Seats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  {sparklineValues.map((value, index) => (
                    <div
                      key={index}
                      className="flex w-6 flex-col justify-end rounded bg-primary/10"
                      style={{ height: `${value}px` }}
                    >
                      <span className="sr-only">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Each bar represents seat usage for the past ten weeks. The mock data helps
                  illustrate how you might swap in a chart component later.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </PermissionGuard>
  );
}
