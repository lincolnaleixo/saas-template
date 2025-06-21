import { z } from 'zod';
import { createLogger } from '../lib/logger';

const logger = createLogger({ source: 'validate-middleware' });

export async function validateBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await req.json();
    const validated = schema.parse(body);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error', {
        path: new URL(req.url).pathname,
        errors: error.errors,
      });
      throw new Response(
        JSON.stringify({
          error: 'Validation failed',
          errors: error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    throw error;
  }
}

export async function validateQuery<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    const validated = schema.parse(params);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const url = new URL(req.url);
      logger.warn('Query validation error', {
        path: url.pathname,
        errors: error.errors,
      });
      throw new Response(
        JSON.stringify({
          error: 'Query validation failed',
          errors: error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    throw error;
  }
}

export async function validateParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const validated = schema.parse(params);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Params validation error', {
        errors: error.errors,
      });
      throw new Response(
        JSON.stringify({
          error: 'Params validation failed',
          errors: error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    throw error;
  }
}