import type { Adapter, AdapterAccount } from "next-auth/adapters";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function ConvexAdapter(convexUrl: string): Adapter {
  const client = new ConvexHttpClient(convexUrl);

  return {
    async createUser(user) {
      const userId = await client.mutation(api.auth.createUser, {
        email: user.email,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
        emailVerified: user.emailVerified ? user.emailVerified.getTime() : undefined,
        superRole: user.superRole ?? undefined,
      });

      return {
        id: userId,
        email: user.email,
        emailVerified: user.emailVerified ?? null,
        name: user.name ?? null,
        image: user.image ?? null,
        superRole: user.superRole ?? null,
      };
    },

    async getUser(id) {
      const user = await client.query(api.auth.getUserById, { id: id as Id<"users"> });
      if (!user) return null;

      return {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        name: user.name ?? null,
        image: user.image ?? null,
        superRole: user.superRole ?? null,
      };
    },

    async getUserByEmail(email) {
      const user = await client.query(api.auth.getUserByEmail, { email });
      if (!user) return null;

      return {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        name: user.name ?? null,
        image: user.image ?? null,
        superRole: user.superRole ?? null,
      };
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await client.query(api.auth.getAccountByProvider, {
        provider,
        providerAccountId,
      });

      if (!account) return null;

      const user = await client.query(api.auth.getUserById, { id: account.userId });
      if (!user) return null;

      return {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        name: user.name ?? null,
        image: user.image ?? null,
        superRole: user.superRole ?? null,
      };
    },

    async updateUser(user) {
      const updated = await client.mutation(api.auth.updateUser, {
        id: user.id as Id<"users">,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
        emailVerified: user.emailVerified ? user.emailVerified.getTime() : undefined,
        superRole: user.superRole ?? undefined,
      });

      if (!updated) throw new Error("User not found");

      return {
        id: updated._id,
        email: updated.email,
        emailVerified: updated.emailVerified ? new Date(updated.emailVerified) : null,
        name: updated.name ?? null,
        image: updated.image ?? null,
        superRole: updated.superRole ?? null,
      };
    },

    async deleteUser(_userId) {
      void _userId;
      // Convex doesn't support deletion in this basic setup
      // You would need to implement a deletion mutation
      throw new Error("Delete user not implemented");
    },

    async linkAccount(account) {
      await client.mutation(api.auth.createAccount, {
        userId: account.userId as Id<"users">,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token ?? undefined,
        access_token: account.access_token ?? undefined,
        expires_at: account.expires_at ?? undefined,
        token_type: account.token_type ?? undefined,
        scope: account.scope ?? undefined,
        id_token: account.id_token ?? undefined,
        session_state:
          typeof account.session_state === "string" ? account.session_state : undefined,
      });

      return account as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId: _providerAccountId, provider: _provider }) {
      void _providerAccountId;
      void _provider;
      // Not implemented for basic setup
      throw new Error("Unlink account not implemented");
    },

    async createSession({ sessionToken, userId, expires }) {
      await client.mutation(api.auth.createSession, {
        sessionToken,
        userId: userId as Id<"users">,
        expires: expires.getTime(),
      });

      return {
        sessionToken,
        userId,
        expires,
      };
    },

    async getSessionAndUser(sessionToken) {
      const session = await client.query(api.auth.getSessionByToken, { sessionToken });
      if (!session) return null;

      const user = await client.query(api.auth.getUserById, { id: session.userId });
      if (!user) return null;

      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: new Date(session.expires),
        },
        user: {
          id: user._id,
          email: user.email,
          emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
          name: user.name ?? null,
          image: user.image ?? null,
          superRole: user.superRole ?? null,
        },
      };
    },

    async updateSession({ sessionToken, expires }) {
      const updated = await client.mutation(api.auth.updateSession, {
        sessionToken,
        expires: expires ? expires.getTime() : undefined,
      });

      if (!updated) return null;

      return {
        sessionToken: updated.sessionToken,
        userId: updated.userId,
        expires: new Date(updated.expires),
      };
    },

    async deleteSession(sessionToken) {
      await client.mutation(api.auth.deleteSession, { sessionToken });
    },

    async createVerificationToken({ identifier: _identifier, expires, token: _token }) {
      void _identifier;
      void _token;
      // Not implemented for basic setup
      return {
        identifier: _identifier,
        expires,
        token: _token,
      };
    },

    async useVerificationToken({ identifier: _identifier, token: _token }) {
      void _identifier;
      void _token;
      // Not implemented for basic setup
      return null;
    },
  };
}
