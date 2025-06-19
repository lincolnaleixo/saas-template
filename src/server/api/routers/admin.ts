import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { db } from '@/lib/drizzle';
import { users, sessions, oauthAccounts } from '../../../infrastructure/database/drizzle/schema';
import { eq, desc, or, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Admin middleware to check if user has admin access
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const authorizedEmails = process.env.ADMIN_ACCESS_EMAILS?.split(',').map(e => e.trim()) || [];
  
  if (!ctx.session.user.email || !authorizedEmails.includes(ctx.session.user.email)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  
  return next({ ctx });
});

export const adminRouter = createTRPCRouter({
  // Get all users with pagination
  listUsers: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      
      const baseQuery = db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users);
      
      // Add search if provided
      let query = baseQuery;
      if (input.search) {
        // Using proper SQL template for ILIKE
        const searchPattern = `%${input.search}%`;
        query = query.where(
          or(
            sql`${users.email} ILIKE ${searchPattern}`,
            sql`${users.name} ILIKE ${searchPattern}`
          )
        );
      }
      
      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::integer` })
        .from(users);
      
      // Get paginated results
      const results = await query
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(offset);
      
      return {
        users: results,
        pagination: {
          page: input.page,
          limit: input.limit,
          total: count,
          totalPages: Math.ceil(count / input.limit),
        },
      };
    }),
  
  // Get single user details
  getUser: adminProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });
      
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      
      // Get OAuth accounts
      const accounts = await db
        .select()
        .from(oauthAccounts)
        .where(eq(oauthAccounts.userId, input.userId));
      
      // Get active sessions
      const activeSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, input.userId));
      
      return {
        ...user,
        oauthAccounts: accounts,
        activeSessions: activeSessions.length,
      };
    }),
  
  // Update user
  updateUser: adminProcedure
    .input(z.object({
      userId: z.string(),
      data: z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(users)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId))
        .returning();
      
      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      
      return updated;
    }),
  
  // Delete user
  deleteUser: adminProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Prevent self-deletion
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete your own account',
        });
      }
      
      // Delete user (cascades to sessions and oauth accounts)
      const [deleted] = await db
        .delete(users)
        .where(eq(users.id, input.userId))
        .returning();
      
      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      
      return { success: true };
    }),
  
  // Revoke all sessions for a user
  revokeUserSessions: adminProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await db
        .delete(sessions)
        .where(eq(sessions.userId, input.userId));
      
      return { success: true };
    }),
  
  // Get admin stats
  getStats: adminProcedure
    .query(async () => {
      const [userStats] = await db
        .select({
          totalUsers: sql<number>`count(*)::integer`,
          newUsersToday: sql<number>`count(*) filter (where date_trunc('day', created_at) = date_trunc('day', now()))::integer`,
          newUsersThisWeek: sql<number>`count(*) filter (where created_at >= now() - interval '7 days')::integer`,
          newUsersThisMonth: sql<number>`count(*) filter (where created_at >= now() - interval '30 days')::integer`,
        })
        .from(users);
      
      const [sessionStats] = await db
        .select({
          activeSessions: sql<number>`count(*)::integer`,
        })
        .from(sessions)
        .where(sql`expires_at > now()`);
      
      const [oauthStats] = await db
        .select({
          googleAccounts: sql<number>`count(*) filter (where provider_id = 'google')::integer`,
        })
        .from(oauthAccounts);
      
      return {
        users: userStats,
        sessions: sessionStats,
        oauth: oauthStats,
      };
    }),
});