/**
 * API Service
 * Handles all API communication with proper error handling
 */

import { logger } from '../lib/logger';
import { toast } from '../components/toast/Toast';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: any[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  showErrors?: boolean;
}

class ApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  
  constructor() {
    // Use relative URLs to work with the same domain
    this.baseUrl = '/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }
  
  /**
   * Make an API request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      skipAuth = false,
      showErrors = true,
      headers = {},
      ...fetchOptions
    } = options;
    
    const url = `${this.baseUrl}${endpoint}`;
    
    // Merge headers
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...(headers as Record<string, string>),
    };
    
    // Add auth token if available and not skipped
    if (!skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }
    
    try {
      logger.debug('API request', { method: fetchOptions.method || 'GET', url });
      
      const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
        credentials: 'include', // Include cookies
      });
      
      // Handle response
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      
      let data: any;
      if (isJson) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      if (!response.ok) {
        const error = new ApiError(
          response.status,
          data.error || data.message || 'Request failed',
          data.errors
        );
        
        logger.error('API error', { status: response.status, error: data });
        
        if (showErrors) {
          this.showError(error);
        }
        
        throw error;
      }
      
      logger.debug('API response', { status: response.status, data });
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      logger.error('API request failed', error);
      
      if (showErrors) {
        toast.error('Network error. Please check your connection.');
      }
      
      throw error;
    }
  }
  
  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }
  
  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
  
  /**
   * Upload file
   */
  async upload<T = any>(
    endpoint: string,
    file: File,
    options?: RequestOptions
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Remove content-type to let browser set it with boundary
    const { 'Content-Type': _, ...headers } = (options?.headers || {}) as Record<string, string>;
    
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers,
      body: formData,
    });
  }
  
  /**
   * Get auth token from storage
   */
  private getAuthToken(): string | null {
    try {
      return localStorage.getItem('auth_token');
    } catch {
      return null;
    }
  }
  
  /**
   * Set auth token
   */
  setAuthToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch {
      // Ignore localStorage errors
    }
  }
  
  /**
   * Show error toast based on error type
   */
  private showError(error: ApiError): void {
    switch (error.status) {
      case 400:
        toast.error('Invalid request. Please check your input.');
        break;
      case 401:
        toast.error('Please login to continue.');
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        break;
      case 403:
        toast.error('You do not have permission to perform this action.');
        break;
      case 404:
        toast.error('The requested resource was not found.');
        break;
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(error.message || 'An error occurred.');
    }
  }
}

// Export singleton instance
export const api = new ApiService();