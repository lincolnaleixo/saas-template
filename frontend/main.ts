import { logger } from './lib/logger';

// Import all components (ensures they're registered before use)
import './components/base/BaseComponent';
import './components/sidebar/AdminSidebar';
import './components/stats-card/StatsCard';
import './components/header/AdminHeader';
import './components/card/Card';
import './components/button/Button';
import './components/modal/Modal';
import './components/toast/Toast';
import './components/data-table/DataTable';

// Import pages
import './pages/AdminDashboardPage';

// Import services
import { authService } from './services/auth.service';
import { apiService } from './services/api.service';

// Wait for critical components to be defined
async function initializeApp() {
  logger.info('Initializing admin dashboard application');
  
  try {
    // Wait for critical components
    await Promise.all([
      customElements.whenDefined('admin-sidebar'),
      customElements.whenDefined('stats-card'),
      customElements.whenDefined('admin-header'),
    ]);
    
    // Check authentication
    const isAuthenticated = await authService.checkAuth();
    if (!isAuthenticated && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
      return;
    }
    
    // Initialize router
    initializeRouter();
    
    // Show the app (remove FOUC)
    document.body.classList.add('components-ready');
    
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', error);
    showErrorMessage('Failed to initialize application. Please refresh the page.');
  }
}

// Simple client-side router
function initializeRouter() {
  const routes = {
    '/': 'admin-dashboard-page',
    '/admin': 'admin-dashboard-page',
    '/admin/users': 'admin-users-page',
    '/admin/analytics': 'admin-analytics-page',
    '/admin/settings': 'admin-settings-page',
  };
  
  function navigate(path: string) {
    const componentName = routes[path] || routes['/'];
    const mainContent = document.querySelector('#app-content');
    
    if (mainContent) {
      mainContent.innerHTML = `<${componentName}></${componentName}>`;
    }
    
    // Update sidebar active state
    const sidebar = document.querySelector('admin-sidebar');
    if (sidebar) {
      const pathToId = {
        '/': 'dashboard',
        '/admin': 'dashboard',
        '/admin/users': 'users',
        '/admin/analytics': 'analytics',
        '/admin/settings': 'settings',
      };
      sidebar.setAttribute('active-item', pathToId[path] || 'dashboard');
    }
  }
  
  // Handle browser navigation
  window.addEventListener('popstate', () => {
    navigate(window.location.pathname);
  });
  
  // Handle link clicks
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest('a');
    if (link && link.href && link.href.startsWith(window.location.origin)) {
      e.preventDefault();
      const path = new URL(link.href).pathname;
      window.history.pushState({}, '', path);
      navigate(path);
    }
  });
  
  // Initial navigation
  navigate(window.location.pathname);
}

// Error display helper
function showErrorMessage(message: string) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: hsl(var(--destructive));
    color: hsl(var(--destructive-foreground));
    padding: 1rem 2rem;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
  `;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);