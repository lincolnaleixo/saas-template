import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/api/trpc';
import { users } from '@/server/db/schema/users.schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const usersRouter = createTRPCRouter({
  list: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.users.findMany({
        orderBy: (users, { desc }) => [desc(users.createdAt)],
      });
    }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
      });
      
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      return user;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      
      const [updated] = await ctx.db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      
      return updated;
    }),
});