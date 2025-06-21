import { getUser, requireAuth as libRequireAuth, requireRole as libRequireRole } from '../lib/auth';
import { createLogger } from '../lib/logger';
import type { User } from '../models/user.model';

/**
 * Authentication middleware
 * Provides auth check decorators and utilities
 */

const logger = createLogger({ source: 'auth-middleware' });

// Re-export from lib/auth for convenience
export { getUser, requireAuth, requireRole } from '../lib/auth';

/**
 * Optional auth middleware
 * Attaches user to request if authenticated, but doesn't require it
 */
export async function optionalAuth(request: Request): Promise<User | null> {
  try {
    const user = await getUser(request);
    
    if (user) {
      logger.debug('User authenticated', { userId: user.id });
    }
    
    return user;
  } catch (error) {
    logger.error('Error in optional auth', error as Error);
    return null;
  }
}

/**
 * Create middleware that checks for specific permissions
 */
export function requirePermission(permission: string) {
  return async (request: Request): Promise<User> => {
    const user = await libRequireAuth(request);
    
    // TODO: Implement permission checking
    // For now, just check if admin
    if (user.role !== 'admin') {
      logger.warn('Permission denied', { userId: user.id, permission });
      throw new Response('Forbidden', { status: 403 });
    }
    
    return user;
  };
}

/**
 * Rate limit by user
 * More lenient than IP-based rate limiting
 */
export function userRateLimit(windowMs: number, max: number) {
  return async (request: Request): Promise<void> => {
    const user = await getUser(request);
    
    if (!user) {
      // No rate limiting for unauthenticated requests
      // They'll be handled by IP-based rate limiting
      return;
    }
    
    // TODO: Implement user-based rate limiting with Redis
    // For now, just log
    logger.debug('User rate limit check', { userId: user.id });
  };
}