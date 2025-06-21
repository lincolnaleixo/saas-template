import { env } from './env';

/**
 * Database configuration
 * All database-related settings from environment variables
 */
export const dbConfig = {
  // Connection string for Drizzle/pg
  connectionString: env.DATABASE_URL,
  
  // Individual connection parameters
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  
  // Connection pool settings
  pool: {
    max: env.DB_POOL_SIZE,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT,
    connectionTimeoutMillis: env.DB_CONNECT_TIMEOUT,
  },
  
  // SSL configuration for production
  ssl: env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // For AWS RDS, etc.
  } : undefined,
};

// Drizzle configuration
export const drizzleConfig = {
  schema: './backend/models/*',
  out: './migrations/drizzle',
  driver: 'pg' as const,
  dbCredentials: {
    connectionString: env.DATABASE_URL,
  },
};