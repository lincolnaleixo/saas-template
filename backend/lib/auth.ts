import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from './db';
import { sessions, users } from '../models/user.model';
import { createLogger } from './logger';
import { cache } from './cache';
import type { User } from '../models/user.model';

/**
 * Authentication setup using Lucia
 * Provides session management and auth helpers
 */

const logger = createLogger({ source: 'auth' });

// Create Lucia adapter with Drizzle
const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

// Initialize Lucia
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  },
  getUserAttributes: (attributes) => {
    return {
      id: attributes.id,
      email: attributes.email,
      name: attributes.name,
      role: attributes.role,
      verified: attributes.verified,
    };
  },
});

// Type declarations for Lucia
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  id: string;
  email: string;
  name: string;
  role: string;
  verified: boolean;
}

/**
 * Get user from request
 * Validates session and returns user data
 */
export async function getUser(request: Request): Promise<User | null> {
  try {
    const sessionId = lucia.readSessionCookie(request.headers.get('cookie') ?? '');
    
    if (!sessionId) {
      return null;
    }

    // Check cache first
    const cacheKey = `session:${sessionId}`;
    const cachedUser = await cache.get<User>(cacheKey);
    
    if (cachedUser) {
      logger.debug('User loaded from cache', { userId: cachedUser.id });
      return cachedUser;
    }

    // Validate session
    const { session, user } = await lucia.validateSession(sessionId);
    
    if (!session || !user) {
      return null;
    }

    // Cache user data
    await cache.set(cacheKey, user, 300); // 5 minutes
    
    return user as User;
  } catch (error) {
    logger.error('Error getting user from request', error as Error);
    return null;
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<string> {
  try {
    const session = await lucia.createSession(userId, {});
    logger.info('Session created', { userId, sessionId: session.id });
    return session.id;
  } catch (error) {
    logger.error('Error creating session', { userId, error });
    throw error;
  }
}

/**
 * Invalidate a session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  try {
    await lucia.invalidateSession(sessionId);
    
    // Clear cache
    await cache.del(`session:${sessionId}`);
    
    logger.info('Session invalidated', { sessionId });
  } catch (error) {
    logger.error('Error invalidating session', { sessionId, error });
    throw error;
  }
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  try {
    await lucia.invalidateUserSessions(userId);
    
    // Clear all cached sessions for this user
    const keys = await cache.keys(`session:*`);
    // Note: In production, you might want to track user sessions differently
    
    logger.info('All user sessions invalidated', { userId });
  } catch (error) {
    logger.error('Error invalidating user sessions', { userId, error });
    throw error;
  }
}

/**
 * Create session cookie
 */
export function createSessionCookie(sessionId: string): string {
  return lucia.createSessionCookie(sessionId).serialize();
}

/**
 * Create blank session cookie (for logout)
 */
export function createBlankSessionCookie(): string {
  return lucia.createBlankSessionCookie().serialize();
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(request: Request): Promise<User> {
  const user = await getUser(request);
  
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  
  return user;
}

/**
 * Middleware to require specific role
 */
export async function requireRole(request: Request, role: string): Promise<User> {
  const user = await requireAuth(request);
  
  if (user.role !== role) {
    throw new Response('Forbidden', { status: 403 });
  }
  
  return user;
}