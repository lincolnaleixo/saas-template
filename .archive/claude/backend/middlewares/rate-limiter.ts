/**
 * @fileoverview Rate limiting middleware
 * Implements IP-based rate limiting to prevent abuse
 */

import { createLogger } from '../lib/logger';

const logger = createLogger({ source: 'rate-limiter' });

// In-memory store for rate limiting (use Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting configuration
 */
const WINDOW_SIZE = parseInt(process.env.RATE_LIMIT_WINDOW || '900000'); // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '100');

/**
 * Rate limiting middleware
 * Tracks requests per IP address and enforces limits
 * @param req - The incoming request
 * @returns Response if rate limit exceeded, null otherwise
 */
export async function rateLimiter(req: Request): Promise<Response | null> {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  
  // Get current request count for this IP
  const current = requestCounts.get(key);
  
  if (!current || now > current.resetTime) {
    // First request or window expired - reset counter
    requestCounts.set(key, {
      count: 1,
      resetTime: now + WINDOW_SIZE,
    });
    
    return null; // Allow request
  }
  
  if (current.count >= MAX_REQUESTS) {
    // Rate limit exceeded
    logger.warn('Rate limit exceeded', {
      ip,
      count: current.count,
      maxRequests: MAX_REQUESTS,
      windowSize: WINDOW_SIZE,
    });
    
    const resetIn = Math.ceil((current.resetTime - now) / 1000);
    
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${resetIn} seconds.`,
        retryAfter: resetIn,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': resetIn.toString(),
          'X-RateLimit-Limit': MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': current.resetTime.toString(),
        },
      }
    );
  }
  
  // Increment counter
  current.count++;
  requestCounts.set(key, current);
  
  // Clean up expired entries (simple cleanup)
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [k, v] of requestCounts.entries()) {
      if (now > v.resetTime) {
        requestCounts.delete(k);
      }
    }
  }
  
  return null; // Allow request
}