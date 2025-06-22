import { BaseComponent } from '../components/base/BaseComponent';
import { SidebarSection } from '../components/sidebar/AdminSidebar';
import { StatsCardData } from '../components/stats-card/StatsCard';
import { apiService } from '../services/api.service';
import { logger } from '../lib/logger';

// Define page styles
const pageStyles = new CSSStyleSheet();
pageStyles.replaceSync(`
  :host {
    display: block;
    height: 100vh;
  }
  
  .dashboard-layout {
    display: grid;
    grid-template-columns: 250px 1fr;
    grid-template-rows: 60px 1fr;
    height: 100%;
  }
  
  admin-header {
    grid-column: 1 / -1;
  }
  
  admin-sidebar {
    grid-row: 2;
  }
  
  .dashboard-main {
    grid-row: 2;
    padding: var(--spacing-xl);
    overflow-y: auto;
    background-color: hsl(var(--muted) / 0.4);
  }
  
  .page-header {
    margin-bottom: var(--spacing-xl);
  }
  
  .page-title {
    margin: 0 0 var(--spacing-sm);
  }
  
  .page-description {
    color: hsl(var(--muted-foreground));
    margin: 0;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
  }
  
  .content-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
  
  @media (max-width: 768px) {
    .dashboard-layout {
      grid-template-columns: 1fr;
    }
    
    admin-sidebar {
      position: fixed;
      left: -250px;
      top: 60px;
      bottom: 0;
      width: 250px;
      transition: left var(--transition-base);
      z-index: 100;
      background-color: hsl(var(--card));
    }
    
    admin-sidebar.open {
      left: 0;
    }
    
    .dashboard-main {
      padding: var(--spacing-lg);
    }
  }
`);

export class AdminDashboardPage extends BaseComponent {
  private statsData: StatsCardData[] = [];
  private recentActivity: any[] = [];
  private loading = true;
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [pageStyles];
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.loadDashboardData();
  }
  
  render() {
    const sidebarSections: SidebarSection[] = [
      {
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: 'lucide-layout-dashboard', href: '/admin' },
          { id: 'users', label: 'Users', icon: 'lucide-users', href: '/admin/users' },
          { id: 'analytics', label: 'Analytics', icon: 'lucide-bar-chart-3', href: '/admin/analytics' },
        ],
      },
      {
        title: 'Management',
        items: [
          { id: 'products', label: 'Products', icon: 'lucide-package', href: '/admin/products' },
          { id: 'orders', label: 'Orders', icon: 'lucide-shopping-cart', href: '/admin/orders' },
          { id: 'settings', label: 'Settings', icon: 'lucide-settings', href: '/admin/settings' },
        ],
      },
    ];
    
    this.shadow.innerHTML = `
      <div class="dashboard-layout">
        <admin-header></admin-header>
        <admin-sidebar active-item="dashboard"></admin-sidebar>
        
        <main class="dashboard-main">
          <div class="page-header">
            <h1 class="page-title">Dashboard Overview</h1>
            <p class="page-description">Welcome back! Here's what's happening with your business today.</p>
          </div>
          
          <div class="stats-grid" id="statsGrid">
            ${this.loading ? this.renderStatsSkeletons() : this.renderStats()}
          </div>
          
          <div class="content-grid">
            <app-card title="Recent Activity" description="Latest transactions and user activities">
              ${this.loading ? this.renderActivitySkeleton() : this.renderActivity()}
            </app-card>
            
            <app-card title="Quick Actions" description="Common tasks and operations">
              <div class="flex gap-3">
                <app-button variant="primary">
                  <i class="lucide-plus"></i>
                  Add New User
                </app-button>
                <app-button variant="secondary">
                  <i class="lucide-download"></i>
                  Export Data
                </app-button>
                <app-button variant="outline">
                  <i class="lucide-file-text"></i>
                  Generate Report
                </app-button>
              </div>
            </app-card>
          </div>
        </main>
      </div>
    `;
    
    this.attachEventListeners();
    this.setupSidebar();
  }
  
  private renderStatsSkeletons(): string {
    return Array(4).fill(0).map(() => 
      '<stats-card loading="true"></stats-card>'
    ).join('');
  }
  
  private renderStats(): string {
    return this.statsData.map((stat, index) => `
      <stats-card 
        label="${stat.label}"
        value="${stat.value}"
        ${stat.change ? `
          change-value="${stat.change.value}"
          change-type="${stat.change.type}"
        ` : ''}
      ></stats-card>
    `).join('');
  }
  
  private renderActivitySkeleton(): string {
    return '<div class="skeleton" style="height: 200px;"></div>';
  }
  
  private renderActivity(): string {
    if (this.recentActivity.length === 0) {
      return '<p class="text-muted">No recent activity to display.</p>';
    }
    
    return `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Activity</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${this.recentActivity.map(activity => `
              <tr>
                <td>${activity.adminEmail}</td>
                <td>${activity.action}</td>
                <td>${this.formatDate(activity.createdAt)}</td>
                <td><span class="badge badge-success">Completed</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  private async loadDashboardData() {
    try {
      const data = await apiService.get('/admin/dashboard');
      
      // Transform stats to cards
      this.statsData = [
        {
          label: 'Total Revenue',
          value: `$${data.stats.totalRevenue.toLocaleString()}`,
          change: {
            value: `+${data.stats.revenueChange}% from last month`,
            type: data.stats.revenueChange > 0 ? 'positive' : 'negative',
          },
        },
        {
          label: 'Active Users',
          value: data.stats.activeUsers.toLocaleString(),
          change: {
            value: `+${data.stats.userChange}% from last month`,
            type: data.stats.userChange > 0 ? 'positive' : 'negative',
          },
        },
        {
          label: 'New Orders',
          value: data.stats.newOrders.toLocaleString(),
          change: {
            value: `${data.stats.orderChange}% from last month`,
            type: data.stats.orderChange > 0 ? 'positive' : 'negative',
          },
        },
        {
          label: 'Total Users',
          value: data.stats.totalUsers.toLocaleString(),
          change: {
            value: 'All registered users',
            type: 'neutral',
          },
        },
      ];
      
      this.recentActivity = data.recentActivity;
      this.loading = false;
      
      this.render();
    } catch (error) {
      logger.error('Failed to load dashboard data', error);
      this.loading = false;
      this.render();
    }
  }
  
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minutes ago`;
    } else if (hours < 24) {
      return `${hours} hours ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} days ago`;
    }
  }
  
  private setupSidebar() {
    const sidebar = this.shadow.querySelector('admin-sidebar');
    if (sidebar) {
      (sidebar as any).setSections([
        {
          items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'lucide-layout-dashboard', href: '/admin' },
            { id: 'users', label: 'Users', icon: 'lucide-users', href: '/admin/users' },
            { id: 'analytics', label: 'Analytics', icon: 'lucide-bar-chart-3', href: '/admin/analytics' },
          ],
        },
        {
          title: 'Management',
          items: [
            { id: 'products', label: 'Products', icon: 'lucide-package', href: '/admin/products' },
            { id: 'orders', label: 'Orders', icon: 'lucide-shopping-cart', href: '/admin/orders' },
            { id: 'settings', label: 'Settings', icon: 'lucide-settings', href: '/admin/settings' },
          ],
        },
      ]);
    }
  }
  
  private attachEventListeners() {
    // Handle mobile menu toggle
    const header = this.shadow.querySelector('admin-header');
    header?.addEventListener('mobile-menu-toggle', () => {
      const sidebar = this.shadow.querySelector('admin-sidebar');
      sidebar?.classList.toggle('open');
    });
    
    // Handle sidebar navigation
    const sidebar = this.shadow.querySelector('admin-sidebar');
    sidebar?.addEventListener('item-click', (e: any) => {
      const { item } = e.detail;
      if (item.href) {
        window.history.pushState({}, '', item.href);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });
  }
}

customElements.define('admin-dashboard-page', AdminDashboardPage);