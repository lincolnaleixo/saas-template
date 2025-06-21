import { env } from './env';

/**
 * Redis configuration
 * Settings for cache and pub/sub
 */
export const redisConfig = {
  // Full connection URL
  url: env.REDIS_URL,
  
  // Individual connection parameters (if not using URL)
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  
  // Connection options
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  
  // Retry strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Connection name for debugging
  connectionName: `${env.APP_NAME}-${env.NODE_ENV}`,
  
  // Command timeout
  commandTimeout: 5000,
};