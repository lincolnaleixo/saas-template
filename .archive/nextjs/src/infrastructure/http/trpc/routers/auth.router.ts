import { createTRPCRouter, publicProcedure } from '../../../../server/api/trpc';
import { loginInputSchema, registerInputSchema } from '@application/auth/dtos/auth.dto';
import { LoginUseCase } from '@application/auth/use-cases/login.use-case';
import { RegisterUseCase } from '@application/auth/use-cases/register.use-case';
import { userRepository } from '@infrastructure/database/repositories';
import { lucia } from '@/lib/auth';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

/**
 * Auth tRPC Router
 * HTTP interface for authentication
 */
export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(async ({ input, ctx }) => {
      const registerUseCase = new RegisterUseCase(userRepository);
      const user = await registerUseCase.execute(input);
      
      // Create session
      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      
      // Set cookie
      ctx.headers.set('Set-Cookie', sessionCookie.serialize());
      
      return {
        user,
        sessionId: session.id,
      };
    }),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(async ({ input, ctx }) => {
      const sessionService = {
        create: async (userId: string) => {
          const session = await lucia.createSession(userId, {});
          const sessionCookie = lucia.createSessionCookie(session.id);
          ctx.headers.set('Set-Cookie', sessionCookie.serialize());
          return session.id;
        },
      };

      const loginUseCase = new LoginUseCase(userRepository, sessionService);
      return await loginUseCase.execute(input);
    }),

  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      const sessionId = ctx.session?.id;
      if (sessionId) {
        await lucia.invalidateSession(sessionId);
        const sessionCookie = lucia.createBlankSessionCookie();
        ctx.headers.set('Set-Cookie', sessionCookie.serialize());
      }
      return { success: true };
    }),

  me: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.userId) {
        return null;
      }

      const user = await userRepository.findById(ctx.session.userId);
      if (!user) {
        return null;
      }

      return {
        id: user.getId(),
        email: user.getEmail(),
        name: user.getName(),
        avatarUrl: user.getAvatarUrl(),
      };
    }),

  getOAuthAccounts: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.userId) {
        return [];
      }

      const { oauthAccountRepository } = await import('@infrastructure/database/repositories');
      const accounts = await oauthAccountRepository.findByUserId(ctx.session.userId);

      return accounts.map(account => ({
        id: account.getId(),
        provider: account.getProvider(),
        createdAt: account.getCreatedAt(),
      }));
    }),

  unlinkOAuthAccount: publicProcedure
    .input(z.object({ provider: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const { oauthAccountRepository } = await import('@infrastructure/database/repositories');
      const accounts = await oauthAccountRepository.findByUserId(ctx.session.userId);
      
      const accountToRemove = accounts.find(acc => acc.getProvider() === input.provider);
      if (!accountToRemove) {
        throw new TRPCError({ 
          code: 'NOT_FOUND',
          message: 'OAuth account not found',
        });
      }

      // Don't allow unlinking if it's the only auth method
      const user = await userRepository.findById(ctx.session.userId);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Check if user has a password (can sign in without OAuth)
      // For now, we'll assume OAuth users have a random password
      // In production, you might want to track this differently
      if (accounts.length === 1) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST',
          message: 'Cannot unlink the only authentication method',
        });
      }

      await oauthAccountRepository.delete(accountToRemove.getId());
      
      return { success: true };
    }),
});