/**
 * Header Component
 * Main navigation header with responsive mobile menu
 */

import { BaseComponent } from '../../base/BaseComponent';
import { logger } from '../../lib/logger';

// Create styles
const headerStyles = new CSSStyleSheet();

// Load CSS
fetch('/components/header/header.css')
  .then(r => r.text())
  .then(css => headerStyles.replaceSync(css))
  .catch(err => logger.error('Failed to load header styles', err));

export class AppHeader extends BaseComponent {
  private mobileMenuOpen = false;
  private currentPath = window.location.pathname;
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [headerStyles];
  }
  
  override render(): void {
    this.shadow.innerHTML = `
      <header class="header">
        <a href="/" class="logo">
          <div class="logo-icon">C</div>
          <span>Conkero</span>
        </a>
        
        <nav>
          <ul class="nav-links">
            <li><a href="/" class="nav-link ${this.currentPath === '/' ? 'active' : ''}">Dashboard</a></li>
            <li><a href="/products" class="nav-link ${this.currentPath === '/products' ? 'active' : ''}">Products</a></li>
            <li><a href="/inventory" class="nav-link">Inventory</a></li>
            <li><a href="/orders" class="nav-link">Orders</a></li>
            <li><a href="/analytics" class="nav-link">Analytics</a></li>
            <li><a href="/settings" class="nav-link ${this.currentPath === '/settings' ? 'active' : ''}">Settings</a></li>
          </ul>
          
          <div class="user-menu">
            <div class="user-avatar" title="User menu">
              <span>U</span>
            </div>
          </div>
          
          <button class="mobile-menu-toggle" aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </nav>
      </header>
      
      <!-- Mobile Menu -->
      <div class="mobile-menu ${this.mobileMenuOpen ? 'open' : ''}">
        <ul class="mobile-nav-links">
          <li><a href="/" class="nav-link">Dashboard</a></li>
          <li><a href="/products" class="nav-link">Products</a></li>
          <li><a href="/inventory" class="nav-link">Inventory</a></li>
          <li><a href="/orders" class="nav-link">Orders</a></li>
          <li><a href="/analytics" class="nav-link">Analytics</a></li>
          <li><a href="/settings" class="nav-link">Settings</a></li>
        </ul>
      </div>
    `;
  }
  
  protected override attachEventListeners(): void {
    // Logo click
    const logo = this.$('.logo') as HTMLAnchorElement;
    logo?.addEventListener('click', this.handleNavigation.bind(this));
    
    // Navigation links
    const navLinks = this.$$('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', this.handleNavigation.bind(this));
    });
    
    // Mobile menu toggle
    const mobileToggle = this.$('.mobile-menu-toggle');
    mobileToggle?.addEventListener('click', this.toggleMobileMenu.bind(this));
    
    // User menu
    const userAvatar = this.$('.user-avatar');
    userAvatar?.addEventListener('click', this.handleUserMenu.bind(this));
  }
  
  private handleNavigation(e: Event): void {
    e.preventDefault();
    const target = e.currentTarget as HTMLAnchorElement;
    const href = target.getAttribute('href');
    
    if (href) {
      logger.info('Navigation', { to: href });
      
      // Update active state
      this.currentPath = href;
      
      // Close mobile menu if open
      this.mobileMenuOpen = false;
      
      // Emit navigation event
      this.emit('navigate', { path: href });
      
      // Update browser history
      window.history.pushState(null, '', href);
      
      // Re-render to update active states
      this.update();
    }
  }
  
  private toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.update();
    logger.debug('Mobile menu toggled', { open: this.mobileMenuOpen });
  }
  
  private handleUserMenu(): void {
    logger.info('User menu clicked');
    // TODO: Show user menu dropdown
    this.emit('user-menu-click');
  }
  
  protected override onConnected(): void {
    logger.debug('Header component connected');
    
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', this.handlePopState.bind(this));
  }
  
  protected override onDisconnected(): void {
    window.removeEventListener('popstate', this.handlePopState.bind(this));
  }
  
  private handlePopState(): void {
    this.currentPath = window.location.pathname;
    this.update();
    this.emit('navigate', { path: this.currentPath });
  }
}

// Register the component
customElements.define('app-header', AppHeader);