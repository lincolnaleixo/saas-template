import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../src/server/api/root';
import { createTRPCContext } from '../../../../src/server/api/trpc';
import { NextRequest } from 'next/server';

/**
 * Edge runtime tRPC handler
 */
const handler = (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError: ({ path, error }) => {
      console.error(
        `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
      );
    },
  });
};

export { handler as GET, handler as POST };