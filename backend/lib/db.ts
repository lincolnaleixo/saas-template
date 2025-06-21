import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createLogger } from './logger';
import * as userSchema from '../models/user.model';
import * as adminSchema from '../models/admin.model';

const logger = createLogger({ source: 'database' });

// Database connection string
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  logger.error('DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL is required');
}

// Create postgres client
const client = postgres(connectionString, {
  max: parseInt(process.env.DB_POOL_SIZE || '10'),
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '2'),
  onnotice: () => {}, // Suppress notices in production
});

// Create drizzle instance with all schemas
export const db = drizzle(client, {
  schema: {
    ...userSchema,
    ...adminSchema,
  },
  logger: process.env.NODE_ENV === 'development',
});

// Export schema for use in other files
export const schema = {
  ...userSchema,
  ...adminSchema,
};

// Database health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', error);
    return false;
  }
}

// Graceful shutdown helper
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await client.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', error);
  }
}