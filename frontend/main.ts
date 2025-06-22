/**
 * Main Application Entry Point
 * Initializes the SPA with routing and components
 */

import { logger } from './lib/logger';
import { Router } from './lib/router';

// Import all components to register them
import './components/header/Header';
import './components/toast/Toast';
import './components/modal/Modal';

// Set up logger
logger.info('Application starting...', {
  environment: 'development',
  timestamp: new Date().toISOString()
});

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  try {
    // Wait for critical components to be defined
    await Promise.all([
      customElements.whenDefined('app-header'),
      customElements.whenDefined('app-toast'),
      customElements.whenDefined('app-modal'),
    ]);
    
    logger.debug('Web components registered');
    
    // Initialize router
    const router = new Router('#app');
    
    // Register routes
    router
      .route('/', () => import('./pages/DashboardPage'), 'Dashboard')
      .route('/products', () => import('./pages/ProductsPage'), 'Products')
      .route('/settings', () => import('./pages/SettingsPage'), 'Settings');
    
    // Start router
    router.start();
    
    logger.info('Router initialized', { 
      routes: ['/', '/products', '/settings'] 
    });
    
    // Show the app (fade in)
    document.body.classList.add('components-ready');
    
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', error);
    
    // Show error message
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <article class="text-center" style="margin-top: 4rem;">
          <h2>Failed to Load Application</h2>
          <p>Please refresh the page to try again.</p>
          <button onclick="location.reload()">Reload Page</button>
        </article>
      `;
    }
  }
}

// Handle unhandled errors
window.addEventListener('error', (event) => {
  logger.error('Unhandled error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason,
    promise: event.promise
  });
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for debugging in console
(window as any).app = {
  logger,
  version: '1.0.0',
  environment: 'development'
};