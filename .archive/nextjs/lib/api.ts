import { createTRPCReact } from '@trpc/react-query';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { type AppRouter } from '@/server/api/root';
import superjson from 'superjson';

/**
 * A set of type-safe react-query hooks for your tRPC API.
 */
export const api = createTRPCReact<AppRouter>();

/**
 * Vanilla client for server-side usage or when React hooks are not available
 */
export const apiClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: '/api/trpc',
      // You can pass any HTTP headers you wish here
      async headers() {
        return {
          // authorization: getAuthCookie(),
        };
      },
    }),
  ],
});

/**
 * Inference helper for input types.
 */
export type RouterInputs = AppRouter['_def']['_config']['$types']['input'];

/**
 * Inference helper for output types.
 */
export type RouterOutputs = AppRouter['_def']['_config']['$types']['output'];