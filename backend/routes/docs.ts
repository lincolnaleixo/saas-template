import { generateOpenAPIDocument } from '../lib/openapi';
import { getUser } from '../lib/auth';
import { env } from '../config/env';
import { createLogger } from '../lib/logger';

/**
 * API documentation routes
 * Serves OpenAPI spec and Swagger UI
 */

const logger = createLogger({ source: 'api-docs' });

/**
 * Serve OpenAPI documentation
 */
export async function serveApiDocs(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // Optional: Require admin access in production
  if (env.NODE_ENV === 'production') {
    const user = await getUser(req);
    if (!user || user.role !== 'admin') {
      logger.warn('Unauthorized access to API docs', { 
        ip: req.headers.get('x-forwarded-for') || 'unknown',
      });
      return new Response('Unauthorized', { status: 401 });
    }
  }
  
  // Serve Swagger UI HTML
  if (url.pathname === '/api-docs') {
    logger.debug('Serving Swagger UI');
    
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>${env.APP_NAME} - API Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
        <style>
          body { 
            margin: 0; 
            background: #fafafa;
          }
          .swagger-ui .topbar { 
            display: none; 
          }
          .swagger-ui .info {
            margin: 50px 0;
          }
          .swagger-ui .scheme-container {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
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
              plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
              ],
              layout: 'StandaloneLayout',
              tryItOutEnabled: true,
              persistAuthorization: true,
              displayRequestDuration: true,
              filter: true,
              showExtensions: true,
              showCommonExtensions: true,
              defaultModelsExpandDepth: 1,
              defaultModelExpandDepth: 1,
              displayOperationId: false,
              docExpansion: 'list',
              validatorUrl: null,
              onComplete: () => {
                console.log('Swagger UI loaded');
              }
            });
          };
        </script>
      </body>
      </html>
    `, {
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  }
  
  // Serve OpenAPI JSON spec
  if (url.pathname === '/api-docs/openapi.json') {
    logger.debug('Serving OpenAPI spec');
    
    const origin = `${url.protocol}//${url.host}`;
    const spec = generateOpenAPIDocument(origin);
    
    return Response.json(spec, {
      headers: {
        'Cache-Control': env.NODE_ENV === 'production' 
          ? 'public, max-age=3600' // Cache for 1 hour in production
          : 'no-cache', // No cache in development
      },
    });
  }
  
  return new Response('Not Found', { status: 404 });
}

// Export route handlers
export const docsRoutes = {
  'GET /api-docs': serveApiDocs,
  'GET /api-docs/openapi.json': serveApiDocs,
};