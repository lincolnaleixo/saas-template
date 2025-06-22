/**
 * Modal Component
 * Beautiful modal dialogs with customizable content
 */

import { BaseComponent } from '../../base/BaseComponent';
import { logger } from '../../lib/logger';

// Create styles
const modalStyles = new CSSStyleSheet();

// Load CSS
fetch('/components/modal/modal.css')
  .then(r => r.text())
  .then(css => modalStyles.replaceSync(css))
  .catch(err => logger.error('Failed to load modal styles', err));

export type ModalSize = 'small' | 'medium' | 'large' | 'full';

export interface ModalOptions {
  title?: string;
  size?: ModalSize;
  closable?: boolean;
  closeOnOverlay?: boolean;
  footer?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export class AppModal extends BaseComponent {
  private isOpen = false;
  private options: ModalOptions = {};
  private content: string = '';
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [modalStyles];
  }
  
  override render(): void {
    const sizeClass = this.options.size && this.options.size !== 'medium' ? this.options.size : '';
    
    this.shadow.innerHTML = `
      <div class="modal-overlay ${this.isOpen ? 'open' : ''}">
        <div class="modal ${sizeClass}" role="dialog" aria-modal="true">
          ${this.options.title ? `
            <div class="modal-header">
              <h2 class="modal-title">${this.escapeHtml(this.options.title)}</h2>
              ${this.options.closable !== false ? `
                <button class="modal-close" aria-label="Close">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              ` : ''}
            </div>
          ` : ''}
          
          <div class="modal-body">
            ${this.content}
          </div>
          
          ${this.options.footer !== false ? `
            <div class="modal-footer">
              <button class="secondary" data-action="cancel">
                ${this.options.cancelText || 'Cancel'}
              </button>
              <button class="primary" data-action="confirm">
                ${this.options.confirmText || 'Confirm'}
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  protected override attachEventListeners(): void {
    // Overlay click
    if (this.options.closeOnOverlay !== false) {
      const overlay = this.$('.modal-overlay');
      overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close();
        }
      });
    }
    
    // Close button
    const closeBtn = this.$('.modal-close');
    closeBtn?.addEventListener('click', () => this.close());
    
    // Footer buttons
    const cancelBtn = this.$('[data-action="cancel"]');
    cancelBtn?.addEventListener('click', () => this.handleCancel());
    
    const confirmBtn = this.$('[data-action="confirm"]');
    confirmBtn?.addEventListener('click', () => this.handleConfirm());
    
    // Escape key
    if (this.isOpen) {
      document.addEventListener('keydown', this.handleEscapeKey.bind(this));
    }
  }
  
  protected override removeEventListeners(): void {
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
  }
  
  /**
   * Open the modal with content and options
   */
  open(content: string, options: ModalOptions = {}): void {
    this.content = content;
    this.options = options;
    this.isOpen = true;
    
    this.update();
    
    // Focus trap
    requestAnimationFrame(() => {
      const firstFocusable = this.shadow.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
      firstFocusable?.focus();
    });
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    logger.debug('Modal opened', { title: options.title });
  }
  
  /**
   * Close the modal
   */
  close(): void {
    this.isOpen = false;
    this.update();
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Emit close event
    this.emit('modal-close');
    
    logger.debug('Modal closed');
  }
  
  /**
   * Show a confirmation dialog
   */
  confirm(message: string, options: Omit<ModalOptions, 'footer'> = {}): Promise<boolean> {
    return new Promise((resolve) => {
      this.open(this.escapeHtml(message), {
        ...options,
        footer: true,
        onConfirm: () => {
          resolve(true);
          this.close();
        },
        onCancel: () => {
          resolve(false);
          this.close();
        },
      });
    });
  }
  
  /**
   * Show an alert dialog
   */
  alert(message: string, options: Omit<ModalOptions, 'footer' | 'cancelText'> = {}): Promise<void> {
    return new Promise((resolve) => {
      this.open(this.escapeHtml(message), {
        ...options,
        footer: true,
        confirmText: options.confirmText || 'OK',
        onConfirm: () => {
          resolve();
          this.close();
        },
      });
      
      // Hide cancel button for alerts
      const cancelBtn = this.$('[data-action="cancel"]') as HTMLElement;
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
    });
  }
  
  /**
   * Show a prompt dialog
   */
  prompt(message: string, defaultValue = '', options: ModalOptions = {}): Promise<string | null> {
    return new Promise((resolve) => {
      const content = `
        <p>${this.escapeHtml(message)}</p>
        <input type="text" value="${this.escapeHtml(defaultValue)}" class="prompt-input" style="width: 100%; margin-top: 1rem;">
      `;
      
      this.open(content, {
        ...options,
        footer: true,
        onConfirm: () => {
          const input = this.$('.prompt-input') as HTMLInputElement;
          resolve(input?.value || null);
          this.close();
        },
        onCancel: () => {
          resolve(null);
          this.close();
        },
      });
      
      // Focus input
      requestAnimationFrame(() => {
        const input = this.$('.prompt-input') as HTMLInputElement;
        input?.focus();
        input?.select();
      });
    });
  }
  
  private handleCancel(): void {
    if (this.options.onCancel) {
      this.options.onCancel();
    } else {
      this.close();
    }
  }
  
  private async handleConfirm(): Promise<void> {
    if (this.options.onConfirm) {
      const confirmBtn = this.$('[data-action="confirm"]') as HTMLButtonElement;
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Loading...';
      }
      
      try {
        await this.options.onConfirm();
      } catch (error) {
        logger.error('Modal confirm error', error);
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = this.options.confirmText || 'Confirm';
        }
      }
    } else {
      this.close();
    }
  }
  
  private handleEscapeKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isOpen && this.options.closable !== false) {
      this.close();
    }
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the component
customElements.define('app-modal', AppModal);

// Create global modal instance
let globalModal: AppModal | null = null;

/**
 * Get or create global modal instance
 */
export function getModal(): AppModal {
  if (!globalModal) {
    globalModal = document.querySelector('app-modal');
    if (!globalModal) {
      globalModal = new AppModal();
      document.body.appendChild(globalModal);
    }
  }
  return globalModal;
}

/**
 * Convenience methods for global modal
 */
export const modal = {
  open: (content: string, options?: ModalOptions) => 
    getModal().open(content, options),
  close: () => 
    getModal().close(),
  confirm: (message: string, options?: Omit<ModalOptions, 'footer'>) => 
    getModal().confirm(message, options),
  alert: (message: string, options?: Omit<ModalOptions, 'footer' | 'cancelText'>) => 
    getModal().alert(message, options),
  prompt: (message: string, defaultValue?: string, options?: ModalOptions) => 
    getModal().prompt(message, defaultValue, options),
};