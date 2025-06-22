import { asyncHandler } from '../middlewares/error-handler';
import { ipRateLimit, pathRateLimit } from '../middlewares/rate-limit';
import { userRoutes } from './users';
import { healthRoutes } from './health';
import { docsRoutes } from './docs';
import { staticRoutes } from './static';
import { createLogger } from '../lib/logger';

/**
 * Central route registry
 * All routes are defined and exported from here
 */

const logger = createLogger({ source: 'routes' });

// Import all route files to register OpenAPI definitions
import './users';
import './health';
import './docs';
import './static';

// Combine all routes
const allRoutes = {
  ...healthRoutes,
  ...docsRoutes,
  ...userRoutes,
  ...staticRoutes,
  // Add more route groups here as you create them
};

// Create route map with middleware
export const routes = new Map<string, (req: Request) => Promise<Response>>();

// Register all routes with error handling
Object.entries(allRoutes).forEach(([pattern, handler]) => {
  routes.set(pattern, asyncHandler(handler));
});

// Middleware pipeline
export const middlewares = [
  // Global rate limiting
  ipRateLimit(),
  
  // Strict rate limiting for auth endpoints
  pathRateLimit('/api/users/login', 60000, 5), // 5 requests per minute
  pathRateLimit('/api/users/register', 300000, 3), // 3 requests per 5 minutes
  pathRateLimit('/api/users/reset-password', 300000, 3), // 3 requests per 5 minutes
];

/**
 * Route matcher
 * Matches incoming requests to registered routes
 */
export function matchRoute(method: string, pathname: string): ((req: Request) => Promise<Response>) | null {
  // Try exact match first
  const exactKey = `${method} ${pathname}`;
  if (routes.has(exactKey)) {
    return routes.get(exactKey)!;
  }
  
  // Try pattern matching for dynamic routes
  for (const [pattern, handler] of routes) {
    const [routeMethod, routePath] = pattern.split(' ');
    
    if (routeMethod !== method) continue;
    
    // Convert route pattern to regex
    const paramNames: string[] = [];
    const regexPattern = routePath
      .replace(/:[^/]+/g, (match) => {
        paramNames.push(match.slice(1));
        return '([^/]+)';
      })
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    const match = pathname.match(regex);
    
    if (match) {
      // TODO: Pass params to handler
      logger.debug('Route matched', { method, pathname, pattern });
      return handler;
    }
  }
  
  return null;
}

/**
 * List all registered routes (for debugging)
 */
export function listRoutes(): string[] {
  return Array.from(routes.keys()).sort();
}