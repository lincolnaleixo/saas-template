/**
 * @fileoverview OpenAPI documentation generation using zod-to-openapi
 * Provides automatic API documentation from Zod schemas
 */

import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

export const registry = new OpenAPIRegistry();

// Common schemas
export const ErrorSchema = registry.register(
  'Error',
  z.object({
    error: z.string(),
    message: z.string().optional(),
    errors: z.array(z.any()).optional(),
    timestamp: z.string(),
  })
);

export const PaginationSchema = registry.register(
  'Pagination',
  z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
);

// Cache for generated documentation
let cachedSpec: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute in development

/**
 * Generate OpenAPI documentation from registered schemas
 * @param baseUrl - Base URL for the API
 * @returns OpenAPI specification object
 */
export function generateOpenAPIDocument(baseUrl: string) {
  const now = Date.now();
  
  // Return cached spec if still valid
  if (cachedSpec && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSpec;
  }
  
  const generator = new OpenApiGeneratorV3(registry.definitions);
  
  cachedSpec = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: process.env.APP_VERSION || '1.0.0',
      title: 'SaaS Admin Dashboard API',
      description: 'Auto-generated API documentation for the admin dashboard',
    },
    servers: [{ url: baseUrl }],
  });
  
  cacheTimestamp = now;
  return cachedSpec;
}

// Clear cache on hot reload in development
if (process.env.NODE_ENV === 'development') {
  process.on('SIGUSR2', () => {
    cachedSpec = null;
  });
}