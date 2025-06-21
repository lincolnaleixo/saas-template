/**
 * API type definitions
 * Global types used across the backend
 */

import type { User } from '../models/user.model';

// Extend Request type with custom properties
declare global {
  interface Request {
    user?: User;
    requestId?: string;
    params?: Record<string, string>;
  }
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  errors?: Array<{
    path: string;
    message: string;
  }>;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request context
export interface RequestContext {
  user?: User;
  requestId: string;
  ip: string;
  userAgent?: string;
}

// Job types
export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Common query parameters
export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
  q?: string;
  filters?: Record<string, string>;
}

// Error types
export interface ValidationError {
  path: string[];
  message: string;
  type: string;
}

// Service response types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Export to prevent TypeScript from treating this as a script
export {};