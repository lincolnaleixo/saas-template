import { env } from './config/env';
import { apiConfig } from './config/api';
import { createLogger } from './lib/logger';
import { checkDatabaseConnection, closeDatabaseConnection } from './lib/db';
import { redis, closeRedisConnection } from './lib/cache';
import { startJobQueue, stopJobQueue } from './lib/jobs';
import { routes, middlewares, matchRoute } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';

/**
 * Main server entry point
 * Initializes all services and starts the HTTP server
 */

const logger = createLogger({ source: 'server' });

// Initialize services
async function initializeServices(): Promise<void> {
  logger.info('Initializing services...');
  
  // Check database connection
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    throw new Error('Failed to connect to database');
  }
  
  // Connect to Redis
  await redis.connect();
  
  // Start job queue
  await startJobQueue();
  
  logger.info('All services initialized successfully');
}

// Create request handler
async function handleRequest(req: Request): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(req.url);
  const method = req.method;
  const pathname = url.pathname;
  
  // Add request ID
  const requestId = crypto.randomUUID();
  const requestLogger = logger.child({ requestId, method, path: pathname });
  
  requestLogger.info('Request received', {
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || 'unknown',
  });
  
  try {
    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': apiConfig.cors.origins[0] || '*',
          'Access-Control-Allow-Methods': apiConfig.cors.methods.join(', '),
          'Access-Control-Allow-Headers': apiConfig.cors.headers.join(', '),
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    // Run middlewares
    for (const middleware of middlewares) {
      const response = await middleware(req);
      if (response) {
        return addCorsHeaders(response);
      }
    }
    
    // Match route
    const handler = matchRoute(method, pathname);
    if (!handler) {
      return addCorsHeaders(notFoundHandler());
    }
    
    // Execute handler
    const response = await handler(req);
    
    // Log response
    const duration = Date.now() - startTime;
    requestLogger.info('Request completed', {
      status: response.status,
      duration,
    });
    
    // Add standard headers
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Response-Time', `${duration}ms`);
    
    return addCorsHeaders(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    requestLogger.error('Request failed', {
      error,
      duration,
    });
    
    return addCorsHeaders(errorHandler(error));
  }
}

// Add CORS headers to response
function addCorsHeaders(response: Response): Response {
  const corsOrigin = apiConfig.cors.origins[0] || '*';
  
  response.headers.set('Access-Control-Allow-Origin', corsOrigin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Vary', 'Origin');
  
  // Security headers
  if (apiConfig.security.contentSecurityPolicy) {
    response.headers.set('Content-Security-Policy', "default-src 'self'");
  }
  response.headers.set('X-Frame-Options', apiConfig.security.xFrameOptions);
  response.headers.set('X-Content-Type-Options', apiConfig.security.xContentTypeOptions);
  response.headers.set('X-XSS-Protection', apiConfig.security.xXssProtection);
  
  if (apiConfig.security.strictTransportSecurity && typeof apiConfig.security.strictTransportSecurity === 'string') {
    response.headers.set('Strict-Transport-Security', apiConfig.security.strictTransportSecurity);
  }
  
  return response;
}

// Graceful shutdown handler
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new requests
  server.stop();
  
  // Wait for ongoing requests to complete
  await new Promise(resolve => setTimeout(resolve, apiConfig.shutdownTimeout));
  
  // Stop services
  await stopJobQueue();
  await closeRedisConnection();
  await closeDatabaseConnection();
  
  logger.info('Graceful shutdown completed');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start server
let server: any;

async function start() {
  try {
    // Initialize all services
    await initializeServices();
    
    // Create Bun server
    server = Bun.serve({
      port: apiConfig.port,
      hostname: apiConfig.host,
      fetch: handleRequest,
      maxRequestBodySize: 10 * 1024 * 1024, // 10MB
      error(error) {
        logger.error('Server error', error);
        return errorHandler(error);
      },
    });
    
    logger.info(`🚀 ${env.APP_NAME} API server running`, {
      url: `http://${apiConfig.host}:${apiConfig.port}`,
      environment: env.NODE_ENV,
      docs: `http://${apiConfig.host}:${apiConfig.port}/api-docs`,
    });
    
    // List all routes in development
    if (env.NODE_ENV === 'development') {
      logger.debug('Registered routes', {
        routes: Array.from(routes.keys()).sort(),
      });
    }
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Start the server
start();