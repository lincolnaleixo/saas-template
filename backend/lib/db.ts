import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { dbConfig } from '../config/database';
import { createLogger } from './logger';

/**
 * Database connection and Drizzle ORM setup
 * Provides the main database client for the application
 */

const logger = createLogger({ source: 'database' });

// Create postgres connection
logger.info('Connecting to database', { 
  host: dbConfig.host,
  database: dbConfig.database,
  user: dbConfig.user,
});

const sql = postgres(dbConfig.connectionString, {
  max: dbConfig.pool.max,
  idle_timeout: dbConfig.pool.idleTimeoutMillis,
  connect_timeout: dbConfig.pool.connectionTimeoutMillis,
  ssl: dbConfig.ssl,
  onnotice: (notice) => {
    logger.debug('Database notice', { notice });
  },
});

// Create Drizzle instance
export const db = drizzle(sql, {
  logger: {
    logQuery: (query, params) => {
      logger.debug('Executing query', { 
        query: query.substring(0, 200), // Truncate long queries
        params,
      });
    },
  },
});

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', error as Error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await sql.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', error as Error);
  }
}

// Export the raw SQL client for advanced queries
export { sql };

// Re-export common Drizzle functions
export { eq, and, or, not, inArray, notInArray, isNull, isNotNull, desc, asc } from 'drizzle-orm';