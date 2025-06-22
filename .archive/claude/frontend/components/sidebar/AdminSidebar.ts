import { BaseComponent } from '../base/BaseComponent';

// Define sidebar styles
const sidebarStyles = new CSSStyleSheet();
sidebarStyles.replaceSync(`
  :host {
    display: block;
    height: 100%;
  }
  
  .sidebar {
    height: 100%;
    background-color: hsl(var(--card));
    border-right: 1px solid hsl(var(--border));
    padding: var(--spacing-lg);
    overflow-y: auto;
  }
  
  .sidebar-nav {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .sidebar-nav-item {
    margin-bottom: var(--spacing-xs);
  }
  
  .sidebar-nav-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    color: hsl(var(--foreground));
    text-decoration: none;
    transition: all var(--transition-fast);
    cursor: pointer;
  }
  
  .sidebar-nav-link:hover {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }
  
  .sidebar-nav-link.active {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  
  .sidebar-nav-link i {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .sidebar-section {
    margin-bottom: var(--spacing-xl);
  }
  
  .sidebar-section-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: hsl(var(--muted-foreground));
    margin-bottom: var(--spacing-sm);
    padding: 0 var(--spacing-md);
  }
`);

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: string;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export class AdminSidebar extends BaseComponent {
  private sections: SidebarSection[] = [];
  private activeItemId: string = '';
  
  static get observedAttributes() {
    return ['active-item'];
  }
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [sidebarStyles];
  }
  
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (name === 'active-item' && newValue !== oldValue) {
      this.activeItemId = newValue || '';
      this.updateActiveState();
    }
  }
  
  setSections(sections: SidebarSection[]) {
    this.sections = sections;
    this.render();
  }
  
  render() {
    this.shadow.innerHTML = `
      <nav class="sidebar">
        ${this.sections.map(section => this.renderSection(section)).join('')}
      </nav>
    `;
    
    this.attachEventListeners();
    this.updateActiveState();
  }
  
  private renderSection(section: SidebarSection): string {
    return `
      <div class="sidebar-section">
        ${section.title ? `<div class="sidebar-section-title">${section.title}</div>` : ''}
        <ul class="sidebar-nav">
          ${section.items.map(item => this.renderItem(item)).join('')}
        </ul>
      </div>
    `;
  }
  
  private renderItem(item: SidebarItem): string {
    return `
      <li class="sidebar-nav-item">
        <a href="${item.href}" 
           class="sidebar-nav-link ${item.id === this.activeItemId ? 'active' : ''}"
           data-item-id="${item.id}">
          <i class="${item.icon}"></i>
          <span>${item.label}</span>
          ${item.badge ? `<span class="badge">${item.badge}</span>` : ''}
        </a>
      </li>
    `;
  }
  
  private attachEventListeners() {
    const links = this.$$('.sidebar-nav-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const itemId = (link as HTMLElement).dataset.itemId;
        if (itemId) {
          this.handleItemClick(itemId);
        }
      });
    });
  }
  
  private handleItemClick(itemId: string) {
    this.activeItemId = itemId;
    this.updateActiveState();
    
    const item = this.sections
      .flatMap(s => s.items)
      .find(i => i.id === itemId);
    
    if (item) {
      this.emit('item-click', { item });
    }
  }
  
  private updateActiveState() {
    const links = this.$$('.sidebar-nav-link');
    links.forEach(link => {
      const itemId = (link as HTMLElement).dataset.itemId;
      if (itemId === this.activeItemId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}

customElements.define('admin-sidebar', AdminSidebar);