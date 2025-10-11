"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession, signOut } from "next-auth/react";
import type { Id } from "@/convex/_generated/dataModel";

type OrganizationRole = "owner" | "admin" | "member" | "super_admin";

interface Organization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
  role: OrganizationRole;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  switchOrganization: (orgId: Id<"organizations">) => void;
  isLoading: boolean;
}

const STORAGE_KEY = "currentOrganizationId";
const LEGACY_STORAGE_KEY = "currentOrganization";

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.superRole === "super_admin";
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [preferredOrganizationId, setPreferredOrganizationId] = useState<
    Id<"organizations"> | null
  >(null);

  const queryOrganizations = useQuery(
    api.auth.getUserOrganizations,
    session?.user?.id ? { userId: session.user.id as Id<"users"> } : "skip"
  );
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [hasLoadedOrganizations, setHasLoadedOrganizations] = useState(false);
  const [hasEverLoadedOrganization, setHasEverLoadedOrganization] = useState(false);

  useEffect(() => {
    if (!Array.isArray(queryOrganizations)) {
      return;
    }

    setHasLoadedOrganizations(true);
    const nextOrganizations = queryOrganizations as Organization[];
    setOrganizations(nextOrganizations);
    setHasEverLoadedOrganization((hadOrganizations) => hadOrganizations || nextOrganizations.length > 0);
  }, [queryOrganizations]);

  const isLoading = !hasLoadedOrganizations;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored) {
      setPreferredOrganizationId(stored as Id<"organizations">);
      return;
    }

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!legacy) {
      return;
    }

    try {
      const parsed = JSON.parse(legacy) as Organization;
      setPreferredOrganizationId(parsed._id);
    } catch (error) {
      console.warn("Failed to parse stored organization", error);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedOrganizations) {
      return;
    }

    if (organizations.length === 0) {
      setCurrentOrganization(null);
      setPreferredOrganizationId(null);
      return;
    }

    const fallback = organizations[0] as Organization;

    if (!preferredOrganizationId) {
      setCurrentOrganization(fallback);
      setPreferredOrganizationId(fallback._id);
      return;
    }

    const matchingOrg = organizations.find(
      (org) => org._id === preferredOrganizationId
    ) as Organization | undefined;

    if (matchingOrg) {
      setCurrentOrganization(matchingOrg);
      return;
    }

    setCurrentOrganization(fallback);
    setPreferredOrganizationId(fallback._id);
  }, [organizations, preferredOrganizationId, hasLoadedOrganizations]);

  useEffect(() => {
    if (!hasLoadedOrganizations) {
      return;
    }

    if (!session?.user?.id) {
      return;
    }

    if (isSuperAdmin) {
      return;
    }

    if (!hasEverLoadedOrganization) {
      return;
    }

    if (organizations.length > 0) {
      return;
    }

    void signOut({ callbackUrl: "/login" });
  }, [
    hasLoadedOrganizations,
    hasEverLoadedOrganization,
    organizations,
    session?.user?.id,
    isSuperAdmin,
  ]);

  const switchOrganization = (orgId: Id<"organizations">) => {
    setPreferredOrganizationId(orgId);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (preferredOrganizationId) {
      window.localStorage.setItem(STORAGE_KEY, preferredOrganizationId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, [preferredOrganizationId]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        switchOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
}
