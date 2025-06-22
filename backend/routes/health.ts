import { checkDatabaseConnection } from '../lib/db';
import { checkRedisConnection } from '../lib/cache';
import { boss } from '../lib/jobs';
import { env } from '../config/env';
import { registry, HealthSchema } from '../lib/openapi';
import { createLogger } from '../lib/logger';

/**
 * Health check routes
 */

const logger = createLogger({ source: 'health' });

// Register OpenAPI documentation
registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Health check endpoint',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: HealthSchema,
        },
      },
    },
    503: {
      description: 'Service is unhealthy',
      content: {
        'application/json': {
          schema: HealthSchema,
        },
      },
    },
  },
});

/**
 * Health check handler
 */
async function healthCheck(req: Request): Promise<Response> {
  const startTime = Date.now();
  
  // Check all services
  const [dbHealthy, redisHealthy] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection(),
  ]);
  
  // Check job queue if available
  let jobsHealthy = true;
  try {
    if (boss && boss.started) {
      // Check if we can connect to the job queue by checking table existence
      // pg-boss creates its own schema and tables
      jobsHealthy = true; // If boss.started is true, it means it's connected
    } else {
      jobsHealthy = false;
    }
  } catch (error) {
    jobsHealthy = false;
    logger.error('Job queue health check failed', error as Error);
  }
  
  const allHealthy = dbHealthy && redisHealthy;
  const status = allHealthy ? 'ok' : 'error';
  const statusCode = allHealthy ? 200 : 503;
  
  const response = {
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy,
      redis: redisHealthy,
      jobs: jobsHealthy,
    },
    version: env.APP_VERSION,
    responseTime: Date.now() - startTime,
  };
  
  logger.debug('Health check completed', response);
  
  return Response.json(response, { status: statusCode });
}

/**
 * Liveness probe (simple check)
 */
async function livenessCheck(req: Request): Promise<Response> {
  return Response.json({ status: 'alive' });
}

/**
 * Readiness probe (checks dependencies)
 */
async function readinessCheck(req: Request): Promise<Response> {
  const dbHealthy = await checkDatabaseConnection();
  const redisHealthy = await checkRedisConnection();
  
  if (dbHealthy && redisHealthy) {
    return Response.json({ status: 'ready' });
  }
  
  return Response.json({ status: 'not ready' }, { status: 503 });
}

// Export route handlers
export const healthRoutes = {
  'GET /health': healthCheck,
  'GET /health/live': livenessCheck,
  'GET /health/ready': readinessCheck,
};