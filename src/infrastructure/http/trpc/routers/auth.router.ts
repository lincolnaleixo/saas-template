import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { loginInputSchema, registerInputSchema } from '@application/auth/dtos/auth.dto';
import { LoginUseCase } from '@application/auth/use-cases/login.use-case';
import { RegisterUseCase } from '@application/auth/use-cases/register.use-case';
import { userRepository } from '@infrastructure/database/repositories';
import { lucia } from '@/lib/auth';

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
        isEmailVerified: user.getIsEmailVerified(),
      };
    }),
});