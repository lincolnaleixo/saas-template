import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/api/trpc';
import { login, logout } from './auth.service';

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      return login(input.email, input.password);
    }),

  logout: protectedProcedure
    .mutation(async () => {
      return logout();
    }),

  me: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.user;
    }),
});