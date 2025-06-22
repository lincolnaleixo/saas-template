import { User } from '../models/user.model';
import { createLogger } from '../lib/logger';

const logger = createLogger({ source: 'auth-middleware' });

// Mock auth functions - replace with actual Lucia auth implementation
export async function getUser(req: Request): Promise<User | null> {
  // TODO: Implement actual auth with Lucia
  // This is a placeholder that returns a mock admin user
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    password: '', // Not exposed
    avatar: null,
    isActive: true,
    isEmailVerified: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function requireAuth(req: Request): Promise<User> {
  const user = await getUser(req);
  
  if (!user) {
    logger.warn('Unauthorized access attempt', {
      path: new URL(req.url).pathname,
      ip: req.headers.get('x-forwarded-for') || 'unknown',
    });
    throw new Response('Unauthorized', { status: 401 });
  }
  
  return user;
}

export async function requireRole(user: User, roles: string[]): Promise<void> {
  if (!roles.includes(user.role)) {
    logger.warn('Insufficient permissions', {
      userId: user.id,
      userRole: user.role,
      requiredRoles: roles,
    });
    throw new Response('Forbidden', { status: 403 });
  }
}