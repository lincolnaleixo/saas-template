/**
 * Simple client-side router for SPA navigation
 */

import { logger } from './logger';

export interface Route {
  path: string;
  component: () => Promise<any>;
  title?: string;
}

export class Router {
  private routes: Map<string, Route> = new Map();
  private currentRoute: Route | null = null;
  private container: HTMLElement | null = null;
  
  constructor(container: string | HTMLElement) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
      
    if (!this.container) {
      throw new Error('Router container not found');
    }
    
    // Listen for navigation events
    window.addEventListener('popstate', () => this.handleRoute());
    
    // Listen for custom navigation events from header
    document.addEventListener('navigate', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.path) {
        this.navigate(customEvent.detail.path);
      }
    });
  }
  
  /**
   * Register a route
   */
  route(path: string, component: () => Promise<any>, title?: string): Router {
    this.routes.set(path, { path, component, title });
    return this;
  }
  
  /**
   * Navigate to a path
   */
  navigate(path: string): void {
    const route = this.routes.get(path);
    if (!route) {
      logger.warn('Route not found', { path });
      // Navigate to home if route not found
      if (path !== '/') {
        this.navigate('/');
      }
      return;
    }
    
    // Update URL without page reload
    window.history.pushState(null, '', path);
    
    // Handle the route
    this.handleRoute();
  }
  
  /**
   * Start the router
   */
  start(): void {
    this.handleRoute();
  }
  
  /**
   * Handle current route
   */
  private async handleRoute(): Promise<void> {
    const path = window.location.pathname;
    const route = this.routes.get(path) || this.routes.get('/');
    
    if (!route || !this.container) {
      return;
    }
    
    // Update current route
    this.currentRoute = route;
    
    // Update document title
    if (route.title) {
      document.title = `${route.title} - Conkero`;
    }
    
    // Show loading state
    this.container.innerHTML = `
      <div class="skeleton" style="height: 400px; margin-top: 2rem;">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `;
    
    try {
      // Load component
      const module = await route.component();
      const ComponentClass = module.default || Object.values(module)[0];
      
      if (!ComponentClass) {
        throw new Error('Component not found in module');
      }
      
      // Create component instance
      const component = new ComponentClass();
      
      // Clear container and append component
      this.container.innerHTML = '';
      this.container.appendChild(component);
      
      logger.info('Route loaded', { path: route.path });
    } catch (error) {
      logger.error('Failed to load route', { path: route.path, error });
      
      // Show error state
      this.container.innerHTML = `
        <article class="text-center" style="margin-top: 4rem;">
          <h2>Oops! Something went wrong</h2>
          <p>Failed to load this page. Please try again.</p>
          <button onclick="location.reload()">Reload Page</button>
        </article>
      `;
    }
  }
  
  /**
   * Get current route
   */
  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }
  
  /**
   * Check if a path is active
   */
  isActive(path: string): boolean {
    return window.location.pathname === path;
  }
}