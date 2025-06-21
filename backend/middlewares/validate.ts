import { z } from 'zod';
import { createLogger } from '../lib/logger';

/**
 * Validation middleware
 * Provides request body validation using Zod schemas
 */

const logger = createLogger({ source: 'validation' });

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error', { 
        path: new URL(request.url).pathname,
        errors: error.errors,
      });
      
      throw Response.json(
        {
          error: 'Validation failed',
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    // JSON parse error
    logger.error('Invalid JSON in request body', error as Error);
    throw Response.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends z.ZodType>(
  request: Request,
  schema: T
): z.infer<T> {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    const validated = schema.parse(params);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Query validation error', {
        path: new URL(request.url).pathname,
        errors: error.errors,
      });
      
      throw Response.json(
        {
          error: 'Invalid query parameters',
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    throw error;
  }
}

/**
 * Validate path parameters
 */
export function validateParams<T extends z.ZodType>(
  params: Record<string, string | undefined>,
  schema: T
): z.infer<T> {
  try {
    const validated = schema.parse(params);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Path parameter validation error', {
        errors: error.errors,
      });
      
      throw Response.json(
        {
          error: 'Invalid path parameters',
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    throw error;
  }
}