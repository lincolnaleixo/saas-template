/**
 * Products Page Component
 * 
 * This component manages the products listing page with the following features:
 * - Displays products in a responsive table format
 * - Search functionality to filter products by title, ASIN, or SKU
 * - Add new products through a modal form
 * - Edit and delete existing products
 * - Loading states with skeleton UI
 * - Empty states with call-to-action
 * 
 * @extends BaseComponent
 */

import { BaseComponent } from '../base/BaseComponent';
import { logger } from '../lib/logger';
import { toast } from '../components/toast/Toast';
import { modal } from '../components/modal/Modal';

// Create styles
const productsStyles = new CSSStyleSheet();

// Load CSS
fetch('/pages/products-page.css')
  .then(r => r.text())
  .then(css => productsStyles.replaceSync(css))
  .catch(err => logger.error('Failed to load products page styles', err));

/**
 * Product data structure
 * @interface Product
 * @property {string} id - Unique identifier for the product
 * @property {string} [image] - Optional product image URL
 * @property {string} title - Product title/name
 * @property {string} asin - Amazon Standard Identification Number (10 characters)
 * @property {string} sku - Stock Keeping Unit identifier
 * @property {number} price - Product price in decimal format
 * @property {string} [currency] - Currency code (default: USD)
 */
interface Product {
  id: string;
  image?: string;
  title: string;
  asin: string;
  sku: string;
  price: number;
  currency?: string;
}

/**
 * ProductsPage component handles the display and management of products
 * @class ProductsPage
 * @extends BaseComponent
 */
export default class ProductsPage extends BaseComponent {
  /** Array of products to display */
  private products: Product[] = [];
  
  /** Loading state indicator */
  private loading = true;
  
  /** Current search query for filtering products */
  private searchQuery = '';
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [productsStyles];
  }
  
  /**
   * Renders the products page based on current state
   * Displays either loading skeleton, product table, or empty state
   * @override
   */
  override render(): void {
    if (this.loading) {
      this.renderLoading();
      return;
    }
    
    const filteredProducts = this.filterProducts();
    
    this.shadow.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Products</h1>
        <div class="page-actions">
          <button class="primary" data-action="add-product">
            Add Product
          </button>
        </div>
      </div>
      
      <div class="filters-section">
        <div class="search-box">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="search" 
            class="search-input" 
            placeholder="Search products..." 
            value="${this.searchQuery}"
          >
        </div>
        
        <button class="secondary" data-action="refresh">
          Refresh
        </button>
      </div>
      
      ${filteredProducts.length > 0 ? `
        <div class="products-table-wrapper">
          <table class="products-table">
            <thead>
              <tr>
                <th style="width: 80px;">Image</th>
                <th>Title</th>
                <th>ASIN</th>
                <th>SKU</th>
                <th style="width: 120px;">Price</th>
                <th style="width: 100px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProducts.map(product => this.renderProductRow(product)).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 7h-9m3 0v10M6 7h3m0 0v10m0-10L6 4m3 3l3-3m5 3h3M9 17h11"/>
            </svg>
          </div>
          <h3 class="empty-state-title">No products found</h3>
          <p class="empty-state-text">
            ${this.searchQuery 
              ? 'Try adjusting your search query' 
              : 'Add your first product to get started'}
          </p>
          ${!this.searchQuery ? `
            <button class="primary" data-action="add-product">
              Add Your First Product
            </button>
          ` : ''}
        </div>
      `}
    `;
  }
  
  /**
   * Renders loading skeleton UI while products are being fetched
   * Shows animated placeholder rows to indicate content is loading
   * @private
   */
  private renderLoading(): void {
    this.shadow.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Products</h1>
      </div>
      
      <div class="loading-skeleton">
        ${Array(5).fill(0).map(() => `
          <div class="skeleton-row">
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton skeleton-text" style="width: 30%;"></div>
            <div class="skeleton skeleton-text" style="width: 15%;"></div>
            <div class="skeleton skeleton-text" style="width: 15%;"></div>
            <div class="skeleton skeleton-text" style="width: 10%;"></div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Renders a single product row in the table
   * @param {Product} product - The product data to render
   * @returns {string} HTML string for the table row
   * @private
   */
  private renderProductRow(product: Product): string {
    return `
      <tr>
        <td>
          ${product.image ? `
            <img src="${product.image}" alt="${product.title}" class="product-image" loading="lazy">
          ` : `
            <div class="product-image-placeholder">
              ${product.title.substring(0, 2).toUpperCase()}
            </div>
          `}
        </td>
        <td>
          <div class="product-title" title="${this.escapeHtml(product.title)}">
            ${this.escapeHtml(product.title)}
          </div>
        </td>
        <td>
          <span class="product-asin">${product.asin}</span>
        </td>
        <td>
          <span class="product-sku">${product.sku}</span>
        </td>
        <td>
          <span class="product-price">
            ${this.formatPrice(product.price, product.currency)}
          </span>
        </td>
        <td>
          <div class="product-actions">
            <button 
              class="action-button" 
              title="Edit" 
              data-action="edit" 
              data-id="${product.id}"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button 
              class="action-button" 
              title="Delete" 
              data-action="delete" 
              data-id="${product.id}"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }
  
  /**
   * Attaches event listeners to interactive elements
   * Sets up handlers for search, add, edit, delete, and refresh actions
   * @override
   * @protected
   */
  protected override attachEventListeners(): void {
    // Search input - Real-time filtering as user types
    const searchInput = this.$('.search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.update(); // Re-render to apply filter
    });
    
    // Add product button
    this.$$('[data-action="add-product"]').forEach(btn => {
      btn.addEventListener('click', () => this.handleAddProduct());
    });
    
    // Refresh button
    const refreshBtn = this.$('[data-action="refresh"]');
    refreshBtn?.addEventListener('click', () => this.loadProducts());
    
    // Edit buttons
    this.$$('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (id) this.handleEditProduct(id);
      });
    });
    
    // Delete buttons
    this.$$('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (id) this.handleDeleteProduct(id);
      });
    });
  }
  
  /**
   * Lifecycle hook called when component is connected to the DOM
   * Initiates product loading on component mount
   * @override
   * @protected
   * @async
   */
  protected override async onConnected(): Promise<void> {
    logger.info('Products page loaded');
    await this.loadProducts();
  }
  
  /**
   * Loads products from the API (currently using mock data)
   * Updates loading state and renders the products table
   * @private
   * @async
   * @todo Replace mock data with actual API call
   */
  private async loadProducts(): Promise<void> {
    this.loading = true;
    this.update();
    
    try {
      // Simulated API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for demonstration - Replace with actual API response
      // TODO: Replace with: this.products = await api.get('/products');
      this.products = [
        {
          id: '1',
          title: 'Wireless Bluetooth Headphones with Active Noise Cancellation',
          asin: 'B08N5WRWNW',
          sku: 'WBH-001-BLK',
          price: 89.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/60x60/4F46E5/ffffff?text=WH'
        },
        {
          id: '2',
          title: 'Smart Home Security Camera 1080p HD',
          asin: 'B089K8DH3J',
          sku: 'CAM-HD-002',
          price: 45.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/60x60/10B981/ffffff?text=SC'
        },
        {
          id: '3',
          title: 'USB-C Hub 7-in-1 Multiport Adapter',
          asin: 'B07TVSLDND',
          sku: 'HUB-USB-003',
          price: 29.99,
          currency: 'USD'
        },
        {
          id: '4',
          title: 'Portable Power Bank 20000mAh Fast Charging',
          asin: 'B08GKW2TRL',
          sku: 'PWR-20K-004',
          price: 39.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/60x60/EF4444/ffffff?text=PB'
        },
        {
          id: '5',
          title: 'Ergonomic Office Chair with Lumbar Support',
          asin: 'B08HR5M4XV',
          sku: 'CHR-ERG-005',
          price: 249.99,
          currency: 'USD'
        }
      ];
      
      logger.info('Products loaded', { count: this.products.length });
    } catch (error) {
      logger.error('Failed to load products', error);
      toast.error('Failed to load products. Please try again.');
    } finally {
      this.loading = false;
      this.update();
    }
  }
  
  /**
   * Filters products based on the current search query
   * Searches through title, ASIN, and SKU fields (case-insensitive)
   * @returns {Product[]} Filtered array of products
   * @private
   */
  private filterProducts(): Product[] {
    if (!this.searchQuery) {
      return this.products;
    }
    
    // Convert search query to lowercase for case-insensitive search
    const query = this.searchQuery.toLowerCase();
    
    // Filter products by matching any of the searchable fields
    return this.products.filter(product => 
      product.title.toLowerCase().includes(query) ||
      product.asin.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query)
    );
  }
  
  /**
   * Handles the add product action
   * Opens a modal with a form to create a new product
   * @private
   * @async
   * @todo Implement API call to save product to backend
   */
  private async handleAddProduct(): Promise<void> {
    logger.info('Add product clicked');
    
    // Show modal with form
    const content = `
      <form id="add-product-form">
        <div class="grid">
          <label>
            Product Title
            <input type="text" name="title" required placeholder="Enter product title">
          </label>
        </div>
        
        <div class="grid">
          <label>
            ASIN
            <input type="text" name="asin" required placeholder="B08N5WRWNW" pattern="[A-Z0-9]{10}">
          </label>
          
          <label>
            SKU
            <input type="text" name="sku" required placeholder="WBH-001-BLK">
          </label>
        </div>
        
        <div class="grid">
          <label>
            Price
            <input type="number" name="price" required placeholder="99.99" step="0.01" min="0">
          </label>
          
          <label>
            Currency
            <select name="currency">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </label>
        </div>
        
        <label>
          Image URL (optional)
          <input type="url" name="image" placeholder="https://example.com/image.jpg">
        </label>
      </form>
    `;
    
    modal.open(content, {
      title: 'Add New Product',
      size: 'medium',
      confirmText: 'Add Product',
      onConfirm: async () => {
        const form = document.getElementById('add-product-form') as HTMLFormElement;
        if (!form.checkValidity()) {
          form.reportValidity();
          throw new Error('Invalid form');
        }
        
        // Extract form data and convert to object
        const formData = new FormData(form);
        const product = Object.fromEntries(formData.entries());
        
        // TODO: Call API to save product
        logger.info('Product to add', product);
        
        toast.success('Product added successfully!');
        modal.close();
        
        // Reload products
        await this.loadProducts();
      }
    });
  }
  
  /**
   * Handles the edit product action
   * @param {string} id - The ID of the product to edit
   * @private
   * @async
   * @todo Implement edit modal and API integration
   */
  private async handleEditProduct(id: string): Promise<void> {
    const product = this.products.find(p => p.id === id);
    if (!product) return;
    
    logger.info('Edit product clicked', { id });
    
    // TODO: Show edit modal
    toast.info(`Edit product: ${product.title}`);
  }
  
  /**
   * Handles the delete product action
   * Shows confirmation dialog before deleting
   * @param {string} id - The ID of the product to delete
   * @private
   * @async
   * @todo Implement API call to delete product from backend
   */
  private async handleDeleteProduct(id: string): Promise<void> {
    const product = this.products.find(p => p.id === id);
    if (!product) return;
    
    logger.info('Delete product clicked', { id });
    
    const confirmed = await modal.confirm(
      `Are you sure you want to delete "${product.title}"?`,
      {
        title: 'Delete Product',
        confirmText: 'Delete',
        size: 'small'
      }
    );
    
    if (confirmed) {
      // TODO: Call API to delete product
      logger.info('Product deleted', { id });
      
      toast.success('Product deleted successfully!');
      
      // Remove from local state for immediate UI update
      // In production, only update after successful API response
      this.products = this.products.filter(p => p.id !== id);
      this.update();
    }
  }
  
  /**
   * Formats a price value according to locale and currency
   * @param {number} price - The price value to format
   * @param {string} [currency='USD'] - The currency code
   * @returns {string} Formatted price string (e.g., "$99.99")
   * @private
   * @example
   * formatPrice(99.99, 'USD') // Returns "$99.99"
   * formatPrice(89.99, 'EUR') // Returns "€89.99"
   */
  private formatPrice(price: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  }
  
  /**
   * Escapes HTML special characters to prevent XSS attacks
   * @param {string} text - The text to escape
   * @returns {string} HTML-safe escaped text
   * @private
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}