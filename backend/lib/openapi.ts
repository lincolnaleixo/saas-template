import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { env } from '../config/env';
import { createLogger } from './logger';

/**
 * OpenAPI documentation setup
 * Auto-generates API documentation from Zod schemas
 */

const logger = createLogger({ source: 'openapi' });

// Create OpenAPI registry
export const registry = new OpenAPIRegistry();

// Define reusable schemas
export const UserSchema = registry.register(
  'User',
  z.object({
    id: z.string().uuid().describe('Unique identifier'),
    email: z.string().email().describe('User email address'),
    name: z.string().describe('User full name'),
    role: z.enum(['user', 'admin']).describe('User role'),
    verified: z.boolean().describe('Email verification status'),
    createdAt: z.string().datetime().describe('Account creation timestamp'),
    updatedAt: z.string().datetime().describe('Last update timestamp'),
  })
);

export const ErrorSchema = registry.register(
  'Error',
  z.object({
    error: z.string().describe('Error message'),
    code: z.string().optional().describe('Error code'),
    errors: z.array(z.any()).optional().describe('Validation errors'),
  })
);

export const PaginationSchema = registry.register(
  'Pagination',
  z.object({
    page: z.number().int().positive().default(1).describe('Current page number'),
    limit: z.number().int().positive().max(100).default(20).describe('Items per page'),
    total: z.number().int().describe('Total number of items'),
    totalPages: z.number().int().describe('Total number of pages'),
  })
);

export const HealthSchema = registry.register(
  'Health',
  z.object({
    status: z.enum(['ok', 'error']).describe('Overall health status'),
    timestamp: z.string().datetime().describe('Health check timestamp'),
    services: z.object({
      database: z.boolean().describe('Database connection status'),
      redis: z.boolean().describe('Redis connection status'),
      jobs: z.boolean().optional().describe('Job queue status'),
    }).describe('Individual service statuses'),
    version: z.string().describe('Application version'),
  })
);

// Cache for generated documentation
let cachedSpec: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = env.NODE_ENV === 'production' ? 3600000 : 60000; // 1 hour in prod, 1 minute in dev

/**
 * Generate OpenAPI documentation
 */
export function generateOpenAPIDocument(baseUrl: string) {
  const now = Date.now();
  
  // Return cached spec if still valid
  if (cachedSpec && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSpec;
  }
  
  logger.info('Generating OpenAPI documentation');
  
  const generator = new OpenApiGeneratorV3(registry.definitions);
  
  cachedSpec = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: env.APP_VERSION,
      title: `${env.APP_NAME} API`,
      description: `API documentation for ${env.APP_NAME} - A SaaS platform for Amazon sellers`,
      contact: {
        name: 'API Support',
        email: 'support@conkero.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [{ 
      url: baseUrl,
      description: env.NODE_ENV === 'production' ? 'Production' : 'Development',
    }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Health', description: 'System health and monitoring' },
    ],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'auth_session',
          description: 'Session-based authentication using HTTP-only cookies',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token authentication',
        },
      },
    },
    security: [{ sessionCookie: [] }],
  });
  
  cacheTimestamp = now;
  logger.debug('OpenAPI documentation generated');
  
  return cachedSpec;
}

// Clear cache on hot reload in development
if (env.NODE_ENV === 'development') {
  process.on('SIGUSR2', () => {
    cachedSpec = null;
    logger.debug('OpenAPI cache cleared');
  });
}

// Helper to create consistent error responses
export function createErrorResponse(statusCode: number, description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: ErrorSchema,
      },
    },
  };
}

// Common response definitions
export const commonResponses = {
  400: createErrorResponse(400, 'Bad Request - Invalid input'),
  401: createErrorResponse(401, 'Unauthorized - Authentication required'),
  403: createErrorResponse(403, 'Forbidden - Insufficient permissions'),
  404: createErrorResponse(404, 'Not Found - Resource does not exist'),
  409: createErrorResponse(409, 'Conflict - Resource already exists'),
  429: createErrorResponse(429, 'Too Many Requests - Rate limit exceeded'),
  500: createErrorResponse(500, 'Internal Server Error'),
};