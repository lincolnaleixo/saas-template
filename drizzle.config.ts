import type { Config } from 'drizzle-kit';

export default {
  schema: './backend/models/*.model.ts',
  out: './migrations/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  // Prefix migrations with timestamp for ordering
  migrations: {
    prefix: 'timestamp',
    table: '__drizzle_migrations',
  },
  // Enable verbose logging
  verbose: true,
  // Enable strict mode for better type safety
  strict: true,
} satisfies Config;