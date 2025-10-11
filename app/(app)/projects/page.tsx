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

const mockProjects = [
  {
    name: "Atlas Redesign",
    owner: "Jess Walton",
    status: "In review",
    updated: "2 days ago",
  },
  {
    name: "Customer Journey Map",
    owner: "Tariq Singh",
    status: "In progress",
    updated: "4 days ago",
  },
  {
    name: "Lifecycle Playbooks",
    owner: "Mira Howard",
    status: "Blocked",
    updated: "1 week ago",
  },
];

export default function ProjectsPage() {
  return (
    <PermissionGuard page="projects">
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
                <BreadcrumbPage>Projects</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <div className="w-full space-y-6">
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Active Initiatives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {mockProjects.map((project) => (
                    <div
                      key={project.name}
                      className="flex flex-col gap-1 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Owner: {project.owner}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground md:items-end">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium uppercase tracking-wide text-primary">
                          {project.status}
                        </span>
                        <span>Updated {project.updated}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Project Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  • Customers highlighted the new AI drafting tool as a key reason for switching.
                </p>
                <p>
                  • The onboarding revamp needs a follow-up experiment. Signups are up, but
                  activation lags for self-serve teams.
                </p>
                <p>
                  • Support and product marketing are teaming up on an in-app tour refresh—ETA next sprint.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </PermissionGuard>
  );
}
