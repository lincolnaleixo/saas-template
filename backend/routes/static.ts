/**
 * Static File Server Route
 * Serves frontend files in development
 */

import { createLogger } from '../lib/logger';
import * as path from 'path';
import { existsSync } from 'fs';

const logger = createLogger({ source: 'static' });

// MIME types for common file extensions
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

/**
 * Serve static files from the frontend directory
 */
export async function serveStatic(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let pathname = url.pathname;
  
  // Default to index.html for root
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Security: prevent directory traversal
  if (pathname.includes('..')) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Construct file path
  const frontendDir = path.join(process.cwd(), 'frontend');
  const filePath = path.join(frontendDir, pathname);
  
  // Check if file exists
  if (!filePath.startsWith(frontendDir) || !existsSync(filePath)) {
    // For SPA routes, return index.html
    const indexPath = path.join(frontendDir, 'index.html');
    if (existsSync(indexPath)) {
      const file = await Bun.file(indexPath);
      return new Response(file, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache',
        },
      });
    }
    return new Response('Not Found', { status: 404 });
  }
  
  try {
    // Serve the file
    const file = await Bun.file(filePath);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Handle TypeScript files - transpile on the fly in development
    if (ext === '.ts' && process.env.NODE_ENV === 'development') {
      const transpiler = new Bun.Transpiler({
        loader: 'ts',
        target: 'browser',
      });
      
      const code = await file.text();
      const result = await transpiler.transform(code);
      
      return new Response(result, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache',
        },
      });
    }
    
    // Cache static assets
    const cacheControl = ext === '.html' || ext === '.js' || ext === '.ts' 
      ? 'no-cache' 
      : 'public, max-age=3600';
    
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    logger.error('Failed to serve static file', { pathname, error });
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Export routes
export const staticRoutes = {
  'GET /': serveStatic,
  'GET /index.html': serveStatic,
  'GET /main.js': serveStatic,
  'GET /lib/*': serveStatic,
  'GET /components/*': serveStatic,
  'GET /pages/*': serveStatic,
  'GET /services/*': serveStatic,
  'GET /styles/*': serveStatic,
  'GET /assets/*': serveStatic,
  // SPA routes
  'GET /products': serveStatic,
  'GET /settings': serveStatic,
  'GET /inventory': serveStatic,
  'GET /orders': serveStatic,
  'GET /analytics': serveStatic,
};