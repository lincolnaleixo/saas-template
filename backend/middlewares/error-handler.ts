import { createLogger } from '../lib/logger';
import { env } from '../config/env';

/**
 * Error handling middleware
 * Provides consistent error responses
 */

const logger = createLogger({ source: 'error-handler' });

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public code?: string,
    public errors?: any[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(error: unknown): Response {
  // Handle Response objects (thrown by middlewares)
  if (error instanceof Response) {
    return error;
  }
  
  // Handle ApiError
  if (error instanceof ApiError) {
    logger.warn('API error', {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
    });
    
    return Response.json(
      {
        error: error.message,
        code: error.code,
        errors: error.errors,
      },
      { status: error.statusCode }
    );
  }
  
  // Handle other known errors
  if (error instanceof Error) {
    logger.error('Unhandled error', error);
    
    // Don't expose internal errors in production
    const message = env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message;
    
    return Response.json(
      {
        error: message,
        ...(env.NODE_ENV !== 'production' && { stack: error.stack }),
      },
      { status: 500 }
    );
  }
  
  // Handle unknown errors
  logger.error('Unknown error type', { error });
  
  return Response.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  );
}

/**
 * Async route wrapper to catch errors
 */
export function asyncHandler(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      return errorHandler(error);
    }
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(): Response {
  return Response.json(
    { error: 'Resource not found' },
    { status: 404 }
  );
}