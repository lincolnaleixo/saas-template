import { createTRPCRouter } from './trpc';
// Import from new DDD structure
import { authRouter } from '@infrastructure/http/trpc/routers/auth.router';
// You can also import from bridge files for compatibility
// import { authRouter } from './routers/auth';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  // Add other routers here as you migrate them to DDD
  // users: usersRouter,
  // posts: postsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;