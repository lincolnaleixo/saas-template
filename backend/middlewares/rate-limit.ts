import { rateLimiter } from '../lib/cache';
import { createLogger } from '../lib/logger';
import { apiConfig } from '../config/api';

/**
 * Rate limiting middleware
 * Implements IP-based and user-based rate limiting
 */

const logger = createLogger({ source: 'rate-limit' });

/**
 * Get client IP from request
 */
function getClientIp(request: Request): string {
  // Check common headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a default (in production, this should be handled by proxy)
  return '127.0.0.1';
}

/**
 * IP-based rate limiting
 */
export function ipRateLimit(
  windowMs: number = apiConfig.rateLimit.windowMs,
  max: number = apiConfig.rateLimit.max
) {
  return async (request: Request): Promise<Response | null> => {
    const ip = getClientIp(request);
    const key = `rate-limit:ip:${ip}`;
    const windowInSeconds = Math.floor(windowMs / 1000);
    
    const allowed = await rateLimiter.checkLimit(key, max, windowInSeconds);
    const count = await rateLimiter.getCount(key);
    
    // Add rate limit headers
    const headers = new Headers({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - count).toString(),
      'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
    });
    
    if (!allowed) {
      logger.warn('Rate limit exceeded', { ip, count, limit: max });
      
      return new Response(
        JSON.stringify({ error: apiConfig.rateLimit.message }),
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': windowInSeconds.toString(),
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    // Rate limit not exceeded, continue
    return null;
  };
}

/**
 * Path-specific rate limiting
 */
export function pathRateLimit(
  path: string,
  windowMs: number,
  max: number
) {
  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);
    
    // Check if this path matches
    if (!url.pathname.startsWith(path)) {
      return null;
    }
    
    const ip = getClientIp(request);
    const key = `rate-limit:path:${path}:${ip}`;
    const windowInSeconds = Math.floor(windowMs / 1000);
    
    const allowed = await rateLimiter.checkLimit(key, max, windowInSeconds);
    
    if (!allowed) {
      logger.warn('Path rate limit exceeded', { path, ip, limit: max });
      
      return new Response(
        JSON.stringify({ error: `Too many requests to ${path}` }),
        {
          status: 429,
          headers: {
            'Retry-After': windowInSeconds.toString(),
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    return null;
  };
}