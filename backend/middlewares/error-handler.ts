/**
 * @fileoverview Central error handling middleware
 * Provides consistent error response format and logging
 */

import { createLogger } from '../lib/logger';

const logger = createLogger({ source: 'error-handler' });

/**
 * Standard error response interface
 */
interface ErrorResponse {
  error: string;
  message?: string;
  errors?: any[];
  timestamp: string;
}

/**
 * Central error handler for all application errors
 * Provides consistent error response format and comprehensive logging
 * @param error - The error object to handle
 * @returns Response with standardized error format
 */
export function errorHandler(error: any): Response {
  logger.error('Application error occurred', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });

  // Handle different error types
  if (error instanceof Response) {
    // Error is already a Response object
    return error;
  }

  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any[] | undefined;

  // Handle validation errors
  if (error.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = error.issues;
  }

  // Handle database errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service Unavailable';
  }

  // Handle authentication errors
  if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
    statusCode = 401;
    message = 'Unauthorized';
  }

  // Handle authorization errors
  if (error.message.includes('Forbidden') || error.message.includes('Insufficient permissions')) {
    statusCode = 403;
    message = 'Forbidden';
  }

  const errorResponse: ErrorResponse = {
    error: message,
    message: error.message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    errorResponse.errors = errors;
  }

  return Response.json(errorResponse, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}