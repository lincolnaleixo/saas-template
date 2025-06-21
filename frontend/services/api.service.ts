import { logger } from '../lib/logger';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: any[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private baseUrl: string;
  private headers: Record<string, string>;
  
  constructor() {
    this.baseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';
    this.headers = {
      'Content-Type': 'application/json',
    };
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      logger.debug('API request', {
        method: options.method || 'GET',
        url,
        body: options.body,
      });
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        credentials: 'include', // Include cookies for auth
      });
      
      const data = await response.json().catch(() => null);
      
      if (!response.ok) {
        throw new ApiError(
          response.status,
          data?.error || `HTTP ${response.status}`,
          data?.errors
        );
      }
      
      logger.debug('API response', {
        status: response.status,
        data,
      });
      
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error('API request failed', error);
      throw new ApiError(
        0,
        error instanceof Error ? error.message : 'Network error'
      );
    }
  }
  
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, 'http://example.com');
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return this.request<T>(url.pathname + url.search, {
      method: 'GET',
    });
  }
  
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
  
  setAuthToken(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`;
  }
  
  clearAuthToken() {
    delete this.headers['Authorization'];
  }
}

export const apiService = new ApiService();