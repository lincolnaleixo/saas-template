import { apiService } from './api.service';
import { logger } from '../lib/logger';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'moderator';
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

class AuthService {
  private currentUser: User | null = null;
  private authCheckPromise: Promise<boolean> | null = null;
  
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await apiService.post<{ user: User; token: string }>(
        '/auth/login',
        credentials
      );
      
      this.currentUser = response.user;
      if (response.token) {
        apiService.setAuthToken(response.token);
      }
      
      logger.info('User logged in', { userId: response.user.id });
      return response.user;
    } catch (error) {
      logger.error('Login failed', error);
      throw error;
    }
  }
  
  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      logger.warn('Logout request failed', error);
    } finally {
      this.currentUser = null;
      apiService.clearAuthToken();
      logger.info('User logged out');
    }
  }
  
  async register(data: RegisterData): Promise<User> {
    try {
      const response = await apiService.post<{ user: User; token: string }>(
        '/auth/register',
        data
      );
      
      this.currentUser = response.user;
      if (response.token) {
        apiService.setAuthToken(response.token);
      }
      
      logger.info('User registered', { userId: response.user.id });
      return response.user;
    } catch (error) {
      logger.error('Registration failed', error);
      throw error;
    }
  }
  
  async checkAuth(): Promise<boolean> {
    // Return existing promise if auth check is in progress
    if (this.authCheckPromise) {
      return this.authCheckPromise;
    }
    
    this.authCheckPromise = this._checkAuth();
    const result = await this.authCheckPromise;
    this.authCheckPromise = null;
    
    return result;
  }
  
  private async _checkAuth(): Promise<boolean> {
    try {
      const response = await apiService.get<{ user: User }>('/auth/me');
      this.currentUser = response.user;
      logger.info('Auth check successful', { userId: response.user.id });
      return true;
    } catch (error) {
      logger.warn('Auth check failed', error);
      this.currentUser = null;
      return false;
    }
  }
  
  async refreshSession(): Promise<boolean> {
    try {
      const response = await apiService.post<{ token: string }>('/auth/refresh');
      if (response.token) {
        apiService.setAuthToken(response.token);
      }
      logger.info('Session refreshed');
      return true;
    } catch (error) {
      logger.error('Session refresh failed', error);
      return false;
    }
  }
  
  getCurrentUser(): User | null {
    return this.currentUser;
  }
  
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
  
  hasRole(roles: string[]): boolean {
    if (!this.currentUser) return false;
    return roles.includes(this.currentUser.role);
  }
  
  isAdmin(): boolean {
    return this.hasRole(['admin']);
  }
  
  isModerator(): boolean {
    return this.hasRole(['admin', 'moderator']);
  }
}

export const authService = new AuthService();