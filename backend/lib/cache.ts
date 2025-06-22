import Redis from 'ioredis';
import { redisConfig } from '../config/redis';
import { createLogger } from './logger';

/**
 * Redis cache client
 * Provides caching and pub/sub functionality
 */

const logger = createLogger({ source: 'cache' });

// Create Redis client
export const redis = new Redis(redisConfig.url, {
  maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
  enableReadyCheck: redisConfig.enableReadyCheck,
  lazyConnect: redisConfig.lazyConnect,
  retryStrategy: redisConfig.retryStrategy,
  connectionName: redisConfig.connectionName,
  commandTimeout: redisConfig.commandTimeout,
});

// Handle Redis events
redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (error) => {
  logger.error('Redis error', error);
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Cache helper functions
export const cache = {
  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      if (!value) return null;
      
      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  },

  /**
   * Set a value in cache with optional TTL
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error });
      return false;
    }
  },

  /**
   * Delete a value from cache
   */
  async del(key: string | string[]): Promise<number> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      return await redis.del(...keys);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      return 0;
    }
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  },

  /**
   * Set key expiration
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error', { key, error });
      return false;
    }
  },

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await redis.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error', { pattern, error });
      return [];
    }
  },

  /**
   * Clear all cache (use with caution!)
   */
  async flush(): Promise<boolean> {
    try {
      await redis.flushdb();
      logger.warn('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  },
};

// Rate limiting helper
export const rateLimiter = {
  /**
   * Check if rate limit is exceeded
   */
  async checkLimit(key: string, limit: number, window: number): Promise<boolean> {
    try {
      const count = await redis.incr(key);
      
      if (count === 1) {
        await redis.expire(key, window);
      }
      
      return count <= limit;
    } catch (error) {
      logger.error('Rate limit check error', { key, error });
      return true; // Allow on error
    }
  },

  /**
   * Get current count for a rate limit key
   */
  async getCount(key: string): Promise<number> {
    try {
      const count = await redis.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Rate limit get count error', { key, error });
      return 0;
    }
  },
};

// Pub/Sub functionality
export const pubsub = {
  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: any): Promise<number> {
    try {
      const serialized = JSON.stringify(message);
      return await redis.publish(channel, serialized);
    } catch (error) {
      logger.error('Pub/sub publish error', { channel, error });
      return 0;
    }
  },

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string, callback: (message: any) => void): void {
    const subscriber = redis.duplicate();
    
    subscriber.subscribe(channel, (err) => {
      if (err) {
        logger.error('Pub/sub subscribe error', { channel, error: err });
      } else {
        logger.info('Subscribed to channel', { channel });
      }
    });

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          logger.error('Pub/sub message parse error', { channel, error });
        }
      }
    });
  },
};

// Health check function
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection', error instanceof Error ? error : new Error(String(error)));
  }
}