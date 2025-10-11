"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useOrganization } from "@/contexts/organization-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OrganizationSwitcher() {
  const { currentOrganization, organizations, switchOrganization, isLoading } = useOrganization();

  if (isLoading) {
    return <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />;
  }

  if (!organizations.length) {
    return null;
  }

  return (
    <Select
      value={currentOrganization?._id}
      onValueChange={(value) => switchOrganization(value as Id<"organizations">)}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org._id} value={org._id}>
            <div className="flex items-center gap-2">
              <span>{org.name}</span>
              <span className="text-xs text-muted-foreground">({org.role})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
