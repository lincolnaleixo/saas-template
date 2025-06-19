import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

/**
 * Example Router - Demonstrates available API endpoints
 * 
 * This router is for documentation purposes to show
 * the structure of our tRPC API endpoints.
 */
export const exampleRouter = createTRPCRouter({
  // Example query endpoint
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name || 'World'}!`,
        timestamp: new Date(),
      };
    }),

  // Example mutation endpoint
  createItem: publicProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // This is just an example - in real app, save to database
      return {
        id: Math.random().toString(36).substring(7),
        ...input,
        createdAt: new Date(),
      };
    }),

  // List example - shows pagination pattern
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
    }))
    .query(({ input }) => {
      // Example response structure
      return {
        items: [
          { id: '1', title: 'Example Item 1' },
          { id: '2', title: 'Example Item 2' },
        ],
        total: 2,
        limit: input.limit,
        offset: input.offset,
      };
    }),
});