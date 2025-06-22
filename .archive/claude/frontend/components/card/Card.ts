import { BaseComponent } from '../base/BaseComponent';

// Define card styles
const cardStyles = new CSSStyleSheet();
cardStyles.replaceSync(`
  :host {
    display: block;
  }
  
  .card {
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-sm);
    height: 100%;
  }
  
  .card.clickable {
    cursor: pointer;
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  }
  
  .card.clickable:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  .card-header {
    margin-bottom: var(--spacing-md);
  }
  
  .card-header.with-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .card-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    color: hsl(var(--foreground));
  }
  
  .card-description {
    color: hsl(var(--muted-foreground));
    font-size: 0.875rem;
    margin: var(--spacing-xs) 0 0;
  }
  
  .card-actions {
    display: flex;
    gap: var(--spacing-sm);
  }
  
  .card-body {
    color: hsl(var(--foreground));
  }
  
  .card-footer {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid hsl(var(--border));
  }
  
  /* Loading skeleton */
  .skeleton .card-title {
    background: hsl(var(--muted));
    height: 1.5rem;
    width: 60%;
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);
  }
  
  .skeleton .card-description {
    background: hsl(var(--muted));
    height: 1rem;
    width: 80%;
    border-radius: var(--radius-md);
  }
  
  .skeleton .card-body {
    background: hsl(var(--muted));
    height: 4rem;
    border-radius: var(--radius-md);
    margin-top: var(--spacing-md);
  }
`);

export interface CardProps {
  title?: string;
  description?: string;
  clickable?: boolean;
  loading?: boolean;
  showFooter?: boolean;
}

export class Card extends BaseComponent {
  private props: CardProps = {};
  
  static get observedAttributes() {
    return ['title', 'description', 'clickable', 'loading'];
  }
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [cardStyles];
  }
  
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'title':
        this.props.title = newValue || undefined;
        break;
      case 'description':
        this.props.description = newValue || undefined;
        break;
      case 'clickable':
        this.props.clickable = newValue === 'true';
        break;
      case 'loading':
        this.props.loading = newValue === 'true';
        break;
    }
    
    this.render();
  }
  
  setProps(props: CardProps) {
    this.props = props;
    this.render();
  }
  
  render() {
    if (this.props.loading) {
      this.renderSkeleton();
      return;
    }
    
    const hasHeader = this.props.title || this.props.description;
    const hasActions = this.querySelector('[slot="actions"]');
    
    this.shadow.innerHTML = `
      <div class="card ${this.props.clickable ? 'clickable' : ''}">
        ${hasHeader ? `
          <div class="card-header ${hasActions ? 'with-actions' : ''}">
            <div>
              ${this.props.title ? `<h3 class="card-title">${this.props.title}</h3>` : ''}
              ${this.props.description ? `<p class="card-description">${this.props.description}</p>` : ''}
            </div>
            ${hasActions ? '<div class="card-actions"><slot name="actions"></slot></div>' : ''}
          </div>
        ` : ''}
        
        <div class="card-body">
          <slot></slot>
        </div>
        
        ${this.props.showFooter || this.querySelector('[slot="footer"]') ? `
          <div class="card-footer">
            <slot name="footer"></slot>
          </div>
        ` : ''}
      </div>
    `;
    
    if (this.props.clickable) {
      this.attachClickHandler();
    }
  }
  
  private renderSkeleton() {
    this.shadow.innerHTML = `
      <div class="card skeleton">
        <div class="card-header">
          <div class="card-title"></div>
          <div class="card-description"></div>
        </div>
        <div class="card-body"></div>
      </div>
    `;
  }
  
  private attachClickHandler() {
    const card = this.$('.card');
    card?.addEventListener('click', () => {
      this.emit('card-click');
    });
  }
}

customElements.define('app-card', Card);