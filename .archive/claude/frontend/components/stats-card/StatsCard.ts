import { BaseComponent } from '../base/BaseComponent';

// Define stats card styles
const statsCardStyles = new CSSStyleSheet();
statsCardStyles.replaceSync(`
  :host {
    display: block;
  }
  
  .stat-card {
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  }
  
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  .stat-label {
    color: hsl(var(--muted-foreground));
    font-size: 0.875rem;
    margin: 0;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    margin: var(--spacing-xs) 0;
    color: hsl(var(--foreground));
  }
  
  .stat-change {
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  
  .stat-change.positive {
    color: hsl(var(--chart-2));
  }
  
  .stat-change.negative {
    color: hsl(var(--destructive));
  }
  
  .stat-change.neutral {
    color: hsl(var(--muted-foreground));
  }
  
  .stat-icon {
    width: 16px;
    height: 16px;
  }
  
  .skeleton .stat-value {
    background: hsl(var(--muted));
    height: 2rem;
    width: 60%;
    border-radius: var(--radius-md);
    margin: var(--spacing-xs) 0;
  }
  
  .skeleton .stat-change {
    background: hsl(var(--muted));
    height: 1rem;
    width: 40%;
    border-radius: var(--radius-md);
  }
`);

export interface StatsCardData {
  label: string;
  value: string | number;
  change?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  icon?: string;
}

export class StatsCard extends BaseComponent {
  private data: StatsCardData | null = null;
  private loading: boolean = true;
  
  static get observedAttributes() {
    return ['label', 'value', 'change-value', 'change-type', 'loading'];
  }
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [statsCardStyles];
  }
  
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'label':
        this.data = { ...this.data, label: newValue || '' } as StatsCardData;
        break;
      case 'value':
        this.data = { ...this.data, value: newValue || '' } as StatsCardData;
        break;
      case 'change-value':
        if (!this.data) this.data = { label: '', value: '' };
        this.data.change = {
          ...this.data.change,
          value: newValue || '',
        } as any;
        break;
      case 'change-type':
        if (!this.data) this.data = { label: '', value: '' };
        if (!this.data.change) this.data.change = { value: '', type: 'neutral' };
        this.data.change.type = (newValue as 'positive' | 'negative' | 'neutral') || 'neutral';
        break;
      case 'loading':
        this.loading = newValue === 'true';
        break;
    }
    
    this.render();
  }
  
  setData(data: StatsCardData) {
    this.data = data;
    this.loading = false;
    this.render();
  }
  
  setLoading(loading: boolean) {
    this.loading = loading;
    this.render();
  }
  
  render() {
    if (this.loading) {
      this.renderSkeleton();
      return;
    }
    
    if (!this.data) {
      this.shadow.innerHTML = '';
      return;
    }
    
    const changeIcon = this.getChangeIcon();
    
    this.shadow.innerHTML = `
      <div class="stat-card">
        <p class="stat-label">${this.data.label}</p>
        <h2 class="stat-value">${this.formatValue(this.data.value)}</h2>
        ${this.data.change ? `
          <div class="stat-change ${this.data.change.type}">
            ${changeIcon ? `<i class="${changeIcon} stat-icon"></i>` : ''}
            <span>${this.data.change.value}</span>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  private renderSkeleton() {
    this.shadow.innerHTML = `
      <div class="stat-card skeleton">
        <p class="stat-label">Loading...</p>
        <div class="stat-value"></div>
        <div class="stat-change"></div>
      </div>
    `;
  }
  
  private formatValue(value: string | number): string {
    if (typeof value === 'number') {
      // Format large numbers with commas
      return value.toLocaleString();
    }
    return value;
  }
  
  private getChangeIcon(): string {
    if (!this.data?.change) return '';
    
    switch (this.data.change.type) {
      case 'positive':
        return 'lucide-trending-up';
      case 'negative':
        return 'lucide-trending-down';
      case 'neutral':
        return 'lucide-activity';
      default:
        return '';
    }
  }
}

customElements.define('stats-card', StatsCard);