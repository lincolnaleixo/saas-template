/**
 * Dashboard Page Component
 * Main dashboard with stats and quick actions
 */

import { BaseComponent } from '../base/BaseComponent';
import { logger } from '../lib/logger';

// Create styles
const dashboardStyles = new CSSStyleSheet();

// Load CSS
fetch('/pages/dashboard-page.css')
  .then(r => r.text())
  .then(css => dashboardStyles.replaceSync(css))
  .catch(err => logger.error('Failed to load dashboard page styles', err));

export default class DashboardPage extends BaseComponent {
  private stats = {
    totalProducts: 157,
    activeListings: 142,
    ordersToday: 23,
    revenue: 4567.89,
  };
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [dashboardStyles];
  }
  
  override render(): void {
    this.shadow.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="welcome-message">Welcome back! Here's what's happening with your Amazon business.</p>
      </div>
      
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Total Products</span>
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 7h-9m3 0v10M6 7h3m0 0v10m0-10L6 4m3 3l3-3m5 3h3M9 17h11"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">${this.stats.totalProducts}</div>
          <div class="stat-change positive">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 17l10-10m0 0v8m0-8h-8"/>
            </svg>
            <span>12% from last month</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Active Listings</span>
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4m0 0v8m0-8h-8M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">${this.stats.activeListings}</div>
          <div class="stat-change positive">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 17l10-10m0 0v8m0-8h-8"/>
            </svg>
            <span>5 new this week</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Orders Today</span>
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">${this.stats.ordersToday}</div>
          <div class="stat-change negative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 7L7 17m0 0h8m-8 0V9"/>
            </svg>
            <span>8% from yesterday</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Today's Revenue</span>
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20m5-17H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">$${this.stats.revenue.toLocaleString()}</div>
          <div class="stat-change positive">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 17l10-10m0 0v8m0-8h-8"/>
            </svg>
            <span>23% from average</span>
          </div>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="quick-actions">
        <h2 class="section-title">Quick Actions</h2>
        <div class="actions-grid">
          <a href="/products" class="action-card" data-action="navigate" data-path="/products">
            <div class="action-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 4v16m8-8H4"/>
              </svg>
            </div>
            <div class="action-title">Add Product</div>
          </a>
          
          <a href="/inventory" class="action-card">
            <div class="action-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 7h-9m3 0v10M6 7h3m0 0v10m0-10L6 4m3 3l3-3m5 3h3M9 17h11"/>
              </svg>
            </div>
            <div class="action-title">Check Inventory</div>
          </a>
          
          <a href="/orders" class="action-card">
            <div class="action-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <div class="action-title">View Orders</div>
          </a>
          
          <a href="/analytics" class="action-card">
            <div class="action-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18M8 17V9m4 8V5m4 12v-3"/>
              </svg>
            </div>
            <div class="action-title">Analytics</div>
          </a>
        </div>
      </div>
      
      <!-- Recent Activity -->
      <div class="recent-activity">
        <h2 class="section-title">Recent Activity</h2>
        <ul class="activity-list">
          <li class="activity-item">
            <div class="activity-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 4v16m8-8H4"/>
              </svg>
            </div>
            <div class="activity-content">
              <div class="activity-title">New product added: Wireless Charger</div>
              <div class="activity-time">2 hours ago</div>
            </div>
          </li>
          
          <li class="activity-item">
            <div class="activity-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
              </svg>
            </div>
            <div class="activity-content">
              <div class="activity-title">Order #12345 shipped to customer</div>
              <div class="activity-time">3 hours ago</div>
            </div>
          </li>
          
          <li class="activity-item">
            <div class="activity-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 7h10v10M7 17L17 7"/>
              </svg>
            </div>
            <div class="activity-content">
              <div class="activity-title">Price updated for 5 products</div>
              <div class="activity-time">5 hours ago</div>
            </div>
          </li>
          
          <li class="activity-item">
            <div class="activity-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="activity-content">
              <div class="activity-title">Inventory sync completed</div>
              <div class="activity-time">Yesterday at 2:00 PM</div>
            </div>
          </li>
        </ul>
      </div>
    `;
  }
  
  protected override attachEventListeners(): void {
    // Navigation actions
    const navActions = this.$$('[data-action="navigate"]');
    navActions.forEach(action => {
      action.addEventListener('click', (e) => {
        e.preventDefault();
        const path = (e.currentTarget as HTMLElement).dataset.path;
        if (path) {
          this.emit('navigate', { path });
          window.history.pushState(null, '', path);
        }
      });
    });
  }
  
  protected override async onConnected(): Promise<void> {
    logger.info('Dashboard page loaded');
    
    // Load fresh stats
    await this.loadStats();
  }
  
  private async loadStats(): Promise<void> {
    try {
      // TODO: Load actual stats from API
      // const stats = await api.get('/stats/dashboard');
      // this.stats = stats;
      // this.update();
      
      logger.debug('Dashboard stats loaded', this.stats);
    } catch (error) {
      logger.error('Failed to load dashboard stats', error);
    }
  }
}