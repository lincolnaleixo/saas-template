import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ConvexAdapter } from "./auth-adapter";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getCanonicalBaseUrl } from "@/lib/env";
import { authConfig } from "@/auth.config";

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Ensure the canonical base URL helper runs during auth setup so NextAuth
// inherits the correct production URL when Vercel injects VERCEL_URL.
getCanonicalBaseUrl();

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: ConvexAdapter(process.env.NEXT_PUBLIC_CONVEX_URL!),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.superRole = user.superRole ?? null;
        return token;
      }

      if (token.sub) {
        try {
          const dbUser = await convexClient.query(api.auth.getUserById, {
            id: token.sub as Id<"users">,
          });
          token.superRole = dbUser?.superRole ?? null;
        } catch (error) {
          console.error("Failed to refresh user super role", error);
        }
      }

      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        const superRoleFromToken = (token?.superRole as "super_admin" | null | undefined) ?? null;
        session.user.id = user?.id ?? (token?.sub as string);
        session.user.superRole = user?.superRole ?? superRoleFromToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async createUser({ user }) {
      try {
        if (!user.email) {
          console.warn("Skipping default organization creation: user email missing");
          return;
        }

        // Check if waitlist is enabled
        const isWaitlistEnabled = await convexClient.query(api.settings.isWaitlistEnabled);

        if (isWaitlistEnabled) {
          // Add user to waitlist
          await convexClient.mutation(api.auth.updateUser, {
            id: user.id as Id<"users">,
            waitlistStatus: "pending",
            waitlistRequestedAt: Date.now(),
          });
          return;
        }

        // Check for pending invitations
        const pendingInvitations = await convexClient.query(
          api.invitations.getPendingInvitationsByEmail,
          { email: user.email }
        );

        if (pendingInvitations.length > 0) {
          return;
        }

        // Create default organization for new users
        const userName = user.name || user.email?.split("@")[0] || "User";
        const slug = `${userName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

        await convexClient.mutation(api.auth.createOrganization, {
          name: `${userName}'s Organization`,
          slug,
          userId: user.id as Id<"users">,
        });
      } catch (error) {
        console.error("Failed to create default organization:", error);
      }
    },
  },
});
