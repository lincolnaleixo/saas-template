import { createLogger } from '../backend/lib/logger';

const logger = createLogger({ source: 'worker-health' });

// Simple health check server for the worker
export function startHealthCheckServer(port: number = 8002) {
  const server = Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);
      
      if (url.pathname === '/health') {
        return new Response('healthy\n', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      
      return new Response('Not Found', { status: 404 });
    },
  });

  logger.info('Worker health check server started', { port });
  
  return server;
}