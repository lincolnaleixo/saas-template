import { createTRPCRouter } from './trpc';
// Import from new DDD structure
import { authRouter } from '@infrastructure/http/trpc/routers/auth.router';
// Example router for documentation
import { exampleRouter } from './routers/example';
// Users router
import { usersRouter } from './routers/users';
// You can also import from bridge files for compatibility
// import { authRouter } from './routers/auth';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  example: exampleRouter, // Example endpoints for documentation
  users: usersRouter, // Users endpoints
  // Add other routers here as you migrate them to DDD
  // posts: postsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;