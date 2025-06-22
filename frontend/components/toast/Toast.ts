/**
 * Toast Component
 * Beautiful notification system with auto-dismiss and progress bar
 */

import { BaseComponent } from '../../base/BaseComponent';
import { logger } from '../../lib/logger';

// Create styles
const toastStyles = new CSSStyleSheet();

// Load CSS
fetch('/components/toast/toast.css')
  .then(r => r.text())
  .then(css => toastStyles.replaceSync(css))
  .catch(err => logger.error('Failed to load toast styles', err));

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  duration?: number; // in milliseconds
  closable?: boolean;
  progress?: boolean;
}

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  options: ToastOptions;
  element?: HTMLElement;
  timer?: number;
}

export class AppToast extends BaseComponent {
  private toasts: Map<string, ToastItem> = new Map();
  private defaultOptions: ToastOptions = {
    duration: 5000,
    closable: true,
    progress: true,
  };
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [toastStyles];
  }
  
  override render(): void {
    this.shadow.innerHTML = `
      <div class="toast-container"></div>
    `;
  }
  
  /**
   * Show a toast notification
   */
  show(message: string, type: ToastType = 'info', options: ToastOptions = {}): string {
    const id = crypto.randomUUID();
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    const toast: ToastItem = {
      id,
      type,
      message,
      options: mergedOptions,
    };
    
    this.toasts.set(id, toast);
    this.addToast(toast);
    
    logger.debug('Toast shown', { id, type, message });
    
    return id;
  }
  
  /**
   * Show success toast
   */
  success(message: string, options?: ToastOptions): string {
    return this.show(message, 'success', options);
  }
  
  /**
   * Show error toast
   */
  error(message: string, options?: ToastOptions): string {
    return this.show(message, 'error', { ...options, duration: 0 }); // Errors don't auto-dismiss by default
  }
  
  /**
   * Show warning toast
   */
  warning(message: string, options?: ToastOptions): string {
    return this.show(message, 'warning', options);
  }
  
  /**
   * Show info toast
   */
  info(message: string, options?: ToastOptions): string {
    return this.show(message, 'info', options);
  }
  
  /**
   * Remove a toast by ID
   */
  removeToast(id: string): void {
    const toast = this.toasts.get(id);
    if (toast) {
      this.removeToast(toast);
    }
  }
  
  /**
   * Clear all toasts
   */
  clear(): void {
    this.toasts.forEach(toast => this.removeToast(toast));
  }
  
  private addToast(toast: ToastItem): void {
    const container = this.$('.toast-container');
    if (!container) return;
    
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${toast.type}`;
    toastEl.innerHTML = `
      <div class="toast-icon">
        ${this.getIcon(toast.type)}
      </div>
      <div class="toast-content">${this.escapeHtml(toast.message)}</div>
      ${toast.options.closable ? `
        <button class="toast-close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      ` : ''}
      ${toast.options.progress && toast.options.duration ? `
        <div class="toast-progress">
          <div class="toast-progress-bar" style="transition-duration: ${toast.options.duration}ms"></div>
        </div>
      ` : ''}
    `;
    
    // Store element reference
    toast.element = toastEl;
    
    // Add to container
    container.appendChild(toastEl);
    
    // Force reflow before adding show class
    toastEl.offsetHeight;
    
    // Show animation
    requestAnimationFrame(() => {
      toastEl.classList.add('show');
      
      // Start progress bar animation
      if (toast.options.progress && toast.options.duration) {
        const progressBar = toastEl.querySelector('.toast-progress-bar') as HTMLElement;
        if (progressBar) {
          requestAnimationFrame(() => {
            progressBar.style.width = '0%';
          });
        }
      }
    });
    
    // Add event listeners
    if (toast.options.closable) {
      const closeBtn = toastEl.querySelector('.toast-close');
      closeBtn?.addEventListener('click', () => this.removeToast(toast));
    }
    
    // Auto-dismiss
    if (toast.options.duration && toast.options.duration > 0) {
      toast.timer = window.setTimeout(() => {
        this.removeToast(toast);
      }, toast.options.duration);
    }
  }
  
  private removeToast(toast: ToastItem): void {
    if (toast.timer) {
      clearTimeout(toast.timer);
    }
    
    if (toast.element) {
      // Hide animation
      toast.element.classList.remove('show');
      
      // Remove after animation
      setTimeout(() => {
        toast.element?.remove();
        this.toasts.delete(toast.id);
      }, 300);
    }
  }
  
  private getIcon(type: ToastType): string {
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5" />
      </svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <path d="M12 9v4m0 4h.01" />
      </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4m0-4h.01" />
      </svg>`,
    };
    
    return icons[type];
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the component
customElements.define('app-toast', AppToast);

// Create global toast instance
let globalToast: AppToast | null = null;

/**
 * Get or create global toast instance
 */
export function getToast(): AppToast {
  if (!globalToast) {
    globalToast = document.querySelector('app-toast');
    if (!globalToast) {
      globalToast = new AppToast();
      document.body.appendChild(globalToast);
    }
  }
  return globalToast;
}

/**
 * Convenience methods for global toast
 */
export const toast = {
  show: (message: string, type?: ToastType, options?: ToastOptions) => 
    getToast().show(message, type, options),
  success: (message: string, options?: ToastOptions) => 
    getToast().success(message, options),
  error: (message: string, options?: ToastOptions) => 
    getToast().error(message, options),
  warning: (message: string, options?: ToastOptions) => 
    getToast().warning(message, options),
  info: (message: string, options?: ToastOptions) => 
    getToast().info(message, options),
  remove: (id: string) => 
    getToast().removeToast(id),
  clear: () => 
    getToast().clear(),
};