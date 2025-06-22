/**
 * @fileoverview Health check endpoint
 * Provides application health status for monitoring and load balancers
 */

import { createLogger } from '../lib/logger';
import { checkDatabaseConnection } from '../lib/db';

const logger = createLogger({ source: 'health' });

/**
 * Health check endpoint
 * Returns application status and dependency health
 * @param req - The incoming request
 * @returns Response with health status
 */
export async function healthCheck(req: Request): Promise<Response> {
  const start = Date.now();
  
  try {
    // Check database connectivity
    const dbHealthy = await checkDatabaseConnection();
    
    const health = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
      },
      responseTime: Date.now() - start,
    };
    
    const statusCode = dbHealthy ? 200 : 503;
    
    return Response.json(health, { 
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    logger.error('Health check failed', error);
    
    return Response.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: Date.now() - start,
    }, { 
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }
}