/**
 * @fileoverview Main application server using Bun runtime
 * Handles HTTP requests, routing, middleware, and database connections
 * Supports both static and dynamic route patterns with parameter extraction
 */

import { logger, createLogger } from './lib/logger';
import { routes } from './routes';
import { errorHandler } from './middlewares/error-handler';
import { rateLimiter } from './middlewares/rate-limiter';
import { getUser } from './lib/auth';
import { db } from './lib/db';

const serverLogger = createLogger({ source: 'server' });

// Server configuration from environment variables
const port = parseInt(process.env.API_PORT || '8000');
const hostname = process.env.API_HOST || '0.0.0.0';

/**
 * Initialize database connection and verify connectivity
 * Exits the process if database connection fails
 * @throws {Error} When database connection cannot be established
 */
async function initializeDatabase() {
  try {
    await db.$client;
    serverLogger.info('Database connection established');
  } catch (error) {
    serverLogger.error('Failed to connect to database', error);
    process.exit(1);
  }
}

// Main server
const server = Bun.serve({
  port,
  hostname,
  
  async fetch(req: Request) {
    const requestLogger = serverLogger.child({
      requestId: crypto.randomUUID(),
      method: req.method,
      url: req.url,
    });
    
    try {
      // Apply rate limiting
      const rateLimitResult = await rateLimiter(req);
      if (rateLimitResult) return rateLimitResult;
      
      // Parse URL
      const url = new URL(req.url);
      const path = url.pathname;
      
      // Log request
      requestLogger.info('Incoming request');
      
      // Match routes
      const routeKey = `${req.method} ${path}`;
      const routeHandler = routes[routeKey];
      
      if (routeHandler) {
        // Add logger to request
        (req as any).logger = requestLogger;
        
        // Execute route handler
        const response = await routeHandler(req);
        
        // Log response
        requestLogger.info('Request completed', {
          status: response.status,
        });
        
        return response;
      }
      
      // Handle dynamic routes (with parameters)
      for (const [key, handler] of Object.entries(routes)) {
        const [method, pattern] = key.split(' ');
        if (method !== req.method) continue;
        
        // Simple parameter matching (e.g., /users/:id)
        const regex = new RegExp(
          '^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$'
        );
        const match = path.match(regex);
        
        if (match) {
          // Extract parameters
          const params = {};
          const paramNames = (pattern.match(/:[^/]+/g) || [])
            .map(p => p.slice(1));
          
          paramNames.forEach((name, index) => {
            params[name] = match[index + 1];
          });
          
          // Add params to request
          (req as any).params = params;
          (req as any).logger = requestLogger;
          
          const response = await handler(req);
          
          requestLogger.info('Request completed', {
            status: response.status,
          });
          
          return response;
        }
      }
      
      // 404 Not Found
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      requestLogger.error('Request failed', error);
      return errorHandler(error);
    }
  },
});

/**
 * Initialize and start the application server
 * Sets up database connection and starts the HTTP server
 * @throws {Error} When server initialization fails
 */
async function start() {
  serverLogger.info('Starting server...');
  
  // Initialize database connection first
  await initializeDatabase();
  
  serverLogger.info(`Server running at http://${hostname}:${port}`);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  serverLogger.info('Received SIGTERM, shutting down gracefully...');
  server.stop();
  await db.$client.$pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  serverLogger.info('Received SIGINT, shutting down gracefully...');
  server.stop();
  await db.$client.$pool.end();
  process.exit(0);
});

// Start server
start().catch((error) => {
  serverLogger.error('Failed to start server', error);
  process.exit(1);
});