import { BaseComponent } from '../base/BaseComponent';

// Define header styles
const headerStyles = new CSSStyleSheet();
headerStyles.replaceSync(`
  :host {
    display: block;
  }
  
  .header {
    background-color: hsl(var(--card));
    border-bottom: 1px solid hsl(var(--border));
    padding: var(--spacing-md) var(--spacing-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }
  
  .header-logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: hsl(var(--primary));
    text-decoration: none;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }
  
  .mobile-menu-toggle {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-sm);
    color: hsl(var(--foreground));
  }
  
  .notification-button {
    position: relative;
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-sm);
    color: hsl(var(--foreground));
    border-radius: var(--radius-md);
    transition: background-color var(--transition-fast);
  }
  
  .notification-button:hover {
    background-color: hsl(var(--accent));
  }
  
  .notification-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    background-color: hsl(var(--destructive));
    border-radius: var(--radius-full);
  }
  
  .user-menu {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-md);
    transition: background-color var(--transition-fast);
  }
  
  .user-menu:hover {
    background-color: hsl(var(--accent));
  }
  
  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    font-size: 0.875rem;
  }
  
  .user-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--foreground));
  }
  
  .dropdown-icon {
    width: 16px;
    height: 16px;
    color: hsl(var(--muted-foreground));
  }
  
  @media (max-width: 768px) {
    .mobile-menu-toggle {
      display: block;
    }
    
    .user-name {
      display: none;
    }
  }
`);

export interface AdminHeaderProps {
  logoText?: string;
  logoHref?: string;
  userName?: string;
  userAvatar?: string;
  notificationCount?: number;
}

export class AdminHeader extends BaseComponent {
  private props: AdminHeaderProps = {
    logoText: 'SaaS Admin',
    logoHref: '/',
    userName: 'Admin User',
    notificationCount: 0,
  };
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [headerStyles];
  }
  
  setProps(props: Partial<AdminHeaderProps>) {
    this.props = { ...this.props, ...props };
    this.render();
  }
  
  render() {
    const userInitials = this.getUserInitials();
    
    this.shadow.innerHTML = `
      <header class="header">
        <div class="header-left">
          <button class="mobile-menu-toggle" id="mobileMenuToggle">
            <i class="lucide-menu"></i>
          </button>
          <a href="${this.props.logoHref}" class="header-logo">
            ${this.props.logoText}
          </a>
        </div>
        
        <div class="header-actions">
          <button class="notification-button" id="notificationButton">
            <i class="lucide-bell"></i>
            ${this.props.notificationCount! > 0 ? '<span class="notification-badge"></span>' : ''}
          </button>
          
          <div class="user-menu" id="userMenu">
            <div class="user-avatar">
              ${this.props.userAvatar 
                ? `<img src="${this.props.userAvatar}" alt="${this.props.userName}">`
                : userInitials
              }
            </div>
            <span class="user-name">${this.props.userName}</span>
            <i class="lucide-chevron-down dropdown-icon"></i>
          </div>
        </div>
      </header>
    `;
    
    this.attachEventListeners();
  }
  
  private getUserInitials(): string {
    if (!this.props.userName) return 'U';
    
    const parts = this.props.userName.split(' ');
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    return this.props.userName.substring(0, 2).toUpperCase();
  }
  
  private attachEventListeners() {
    // Mobile menu toggle
    const mobileMenuToggle = this.$('#mobileMenuToggle');
    mobileMenuToggle?.addEventListener('click', () => {
      this.emit('mobile-menu-toggle');
    });
    
    // Notification button
    const notificationButton = this.$('#notificationButton');
    notificationButton?.addEventListener('click', () => {
      this.emit('notification-click');
    });
    
    // User menu
    const userMenu = this.$('#userMenu');
    userMenu?.addEventListener('click', () => {
      this.emit('user-menu-click');
    });
  }
}

customElements.define('admin-header', AdminHeader);