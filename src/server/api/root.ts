import { createTRPCRouter } from './trpc';
import { authRouter } from '@auth/server/auth.router';
import { usersRouter } from '@users/server/users.router';
import { postsRouter } from '@posts/server/posts.router';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  posts: postsRouter,
});

export type AppRouter = typeof appRouter;