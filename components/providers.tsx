"use client";

import { SessionProvider } from "next-auth/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { OrganizationProvider } from "@/contexts/organization-context";
import { WaitlistGuard } from "@/components/waitlist-guard";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ConvexProvider client={convex}>
        <WaitlistGuard>
          <OrganizationProvider>{children}</OrganizationProvider>
        </WaitlistGuard>
      </ConvexProvider>
    </SessionProvider>
  );
}
