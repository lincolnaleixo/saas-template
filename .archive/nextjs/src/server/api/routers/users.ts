import { createTRPCRouter, protectedProcedure } from '../trpc';
import { db } from '@/lib/drizzle';
import { users } from '../../../infrastructure/database/drizzle/schema';
import { desc } from 'drizzle-orm';

export const usersRouter = createTRPCRouter({
  // Simple list users endpoint - only for admin users
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user is admin
      const authorizedEmails = process.env.ADMIN_ACCESS_EMAILS?.split(',').map(e => e.trim()) || [];
      
      if (!ctx.session.user.email || !authorizedEmails.includes(ctx.session.user.email)) {
        throw new Error('Unauthorized');
      }
      
      // Get all users
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));
      
      return allUsers;
    }),
});