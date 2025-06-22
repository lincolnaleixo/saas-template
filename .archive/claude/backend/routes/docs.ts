/**
 * @fileoverview API documentation endpoints
 * Serves Swagger UI and OpenAPI specifications
 */

import { generateOpenAPIDocument } from '../lib/openapi';
import { requireAuth, requireRole } from '../middlewares/auth';
import { createLogger } from '../lib/logger';

const logger = createLogger({ source: 'docs' });

/**
 * Serve API documentation (Swagger UI) and OpenAPI JSON
 * @param req - The incoming request
 * @returns Response with Swagger UI or OpenAPI spec
 */
export async function serveApiDocs(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  try {
    // Optional: Require authentication for API docs
    // const user = await requireAuth(req);
    // await requireRole(user, ['admin', 'moderator']);
    
    // Serve Swagger UI
    if (pathname === '/api-docs') {
      logger.info('Serving Swagger UI');
      
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SaaS Admin Dashboard API</title>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
          <style>
            body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
            .swagger-ui .topbar { display: none; }
            .swagger-ui .info { margin: 20px 0; }
          </style>
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
          <script>
            window.onload = () => {
              SwaggerUIBundle({
                url: '/api-docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: 'BaseLayout',
                tryItOutEnabled: true,
                persistAuthorization: true,
                docExpansion: 'list',
                defaultModelsExpandDepth: 2,
                defaultModelExpandDepth: 2,
              });
            };
          </script>
        </body>
        </html>
      `, {
        headers: { 
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache',
        }
      });
    }
    
    // Serve OpenAPI JSON specification
    if (pathname === '/api-docs/openapi.json') {
      logger.info('Serving OpenAPI specification');
      
      const origin = `${url.protocol}//${url.host}`;
      const spec = generateOpenAPIDocument(origin);
      
      return Response.json(spec, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      });
    }
    
    return new Response('Not Found', { status: 404 });
    
  } catch (error) {
    logger.error('Failed to serve API docs', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}