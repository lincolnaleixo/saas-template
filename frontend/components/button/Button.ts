import { BaseComponent } from '../base/BaseComponent';

// Define button styles
const buttonStyles = new CSSStyleSheet();
buttonStyles.replaceSync(`
  :host {
    display: inline-block;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-decoration: none;
    line-height: 1;
    white-space: nowrap;
    gap: var(--spacing-xs);
    font-family: inherit;
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Variants */
  .btn-primary {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: hsl(var(--primary) / 0.9);
  }
  
  .btn-secondary {
    background-color: hsl(var(--secondary));
    color: hsl(var(--secondary-foreground));
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: hsl(var(--secondary) / 0.8);
  }
  
  .btn-outline {
    background-color: transparent;
    border-color: hsl(var(--border));
    color: hsl(var(--foreground));
  }
  
  .btn-outline:hover:not(:disabled) {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }
  
  .btn-destructive {
    background-color: hsl(var(--destructive));
    color: hsl(var(--destructive-foreground));
  }
  
  .btn-destructive:hover:not(:disabled) {
    background-color: hsl(var(--destructive) / 0.9);
  }
  
  .btn-ghost {
    background-color: transparent;
    color: hsl(var(--foreground));
  }
  
  .btn-ghost:hover:not(:disabled) {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }
  
  /* Sizes */
  .btn-sm {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.75rem;
  }
  
  .btn-lg {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: 1rem;
  }
  
  .btn-icon {
    padding: var(--spacing-sm);
  }
  
  /* Loading state */
  .btn.loading {
    position: relative;
    color: transparent;
  }
  
  .btn.loading::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    top: 50%;
    left: 50%;
    margin-left: -8px;
    margin-top: -8px;
    border: 2px solid hsl(var(--primary-foreground));
    border-radius: 50%;
    border-top-color: transparent;
    animation: spinner 0.6s linear infinite;
  }
  
  .btn-outline.loading::after,
  .btn-ghost.loading::after {
    border-color: hsl(var(--foreground));
    border-top-color: transparent;
  }
  
  @keyframes spinner {
    to { transform: rotate(360deg); }
  }
  
  /* Icon styles */
  .btn i {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .btn-icon i {
    width: 18px;
    height: 18px;
  }
`);

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
}

export class Button extends BaseComponent {
  private props: ButtonProps = {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    type: 'button',
  };
  
  static get observedAttributes() {
    return ['variant', 'size', 'disabled', 'loading', 'type', 'href'];
  }
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [buttonStyles];
  }
  
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'variant':
        this.props.variant = (newValue as ButtonVariant) || 'primary';
        break;
      case 'size':
        this.props.size = (newValue as ButtonSize) || 'md';
        break;
      case 'disabled':
        this.props.disabled = newValue === 'true';
        break;
      case 'loading':
        this.props.loading = newValue === 'true';
        break;
      case 'type':
        this.props.type = (newValue as any) || 'button';
        break;
      case 'href':
        this.props.href = newValue || undefined;
        break;
    }
    
    this.render();
  }
  
  setProps(props: ButtonProps) {
    this.props = { ...this.props, ...props };
    this.render();
  }
  
  render() {
    const tag = this.props.href ? 'a' : 'button';
    const sizeClass = this.props.size === 'md' ? '' : `btn-${this.props.size}`;
    const classes = [
      'btn',
      `btn-${this.props.variant}`,
      sizeClass,
      this.props.loading ? 'loading' : '',
    ].filter(Boolean).join(' ');
    
    const attributes = [
      this.props.disabled ? 'disabled' : '',
      !this.props.href ? `type="${this.props.type}"` : '',
      this.props.href ? `href="${this.props.href}"` : '',
    ].filter(Boolean).join(' ');
    
    this.shadow.innerHTML = `
      <${tag} class="${classes}" ${attributes}>
        <slot></slot>
      </${tag}>
    `;
    
    this.attachEventListeners();
  }
  
  private attachEventListeners() {
    const button = this.$('.btn');
    if (!button) return;
    
    button.addEventListener('click', (e) => {
      if (this.props.disabled || this.props.loading) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // For links, let the browser handle navigation unless prevented
      if (this.props.href) {
        return;
      }
      
      this.emit('button-click', { originalEvent: e });
    });
  }
}

customElements.define('app-button', Button);