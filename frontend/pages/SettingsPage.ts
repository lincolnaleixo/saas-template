/**
 * Settings Page Component
 * 
 * A comprehensive settings interface with multiple sections:
 * - General: Company information, language, timezone, and date format
 * - Account: Personal information and profile management
 * - Notifications: Email and alert preferences
 * - Integrations: External service connections (Amazon Seller Central)
 * 
 * Features:
 * - Tabbed navigation between sections
 * - Form validation and submission
 * - Loading states during save operations
 * - Success/error notifications
 * 
 * @extends BaseComponent
 */

import { BaseComponent } from '../base/BaseComponent';
import { logger } from '../lib/logger';
import { toast } from '../components/toast/Toast';

// Create styles
const settingsStyles = new CSSStyleSheet();

// Load CSS
fetch('/pages/settings-page.css')
  .then(r => r.text())
  .then(css => settingsStyles.replaceSync(css))
  .catch(err => logger.error('Failed to load settings page styles', err));

/**
 * Available settings sections
 * @typedef {'general' | 'account' | 'notifications' | 'integrations'} SettingsSection
 */
type SettingsSection = 'general' | 'account' | 'notifications' | 'integrations';

/**
 * SettingsPage component manages application and user settings
 * @class SettingsPage
 * @extends BaseComponent
 */
export default class SettingsPage extends BaseComponent {
  /** Currently active settings section */
  private activeSection: SettingsSection = 'general';
  
  /** Loading state for form submissions */
  private loading = false;
  
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [settingsStyles];
  }
  
  /**
   * Renders the settings page with navigation and active section
   * Creates a two-column layout with sidebar navigation
   * @override
   */
  override render(): void {
    this.shadow.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-description">Manage your account and application preferences</p>
      </div>
      
      <div class="settings-layout">
        <!-- Settings Navigation -->
        <nav class="settings-nav">
          <ul class="settings-nav-list">
            <li class="settings-nav-item">
              <a href="#general" class="settings-nav-link ${this.activeSection === 'general' ? 'active' : ''}" data-section="general">
                <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m18.364-6.364l-4.243 4.243M7.879 7.879L3.636 3.636m0 16.728l4.243-4.243m8.242 0l4.243 4.243"></path>
                </svg>
                General
              </a>
            </li>
            <li class="settings-nav-item">
              <a href="#account" class="settings-nav-link ${this.activeSection === 'account' ? 'active' : ''}" data-section="account">
                <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Account
              </a>
            </li>
            <li class="settings-nav-item">
              <a href="#notifications" class="settings-nav-link ${this.activeSection === 'notifications' ? 'active' : ''}" data-section="notifications">
                <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"></path>
                </svg>
                Notifications
              </a>
            </li>
            <li class="settings-nav-item">
              <a href="#integrations" class="settings-nav-link ${this.activeSection === 'integrations' ? 'active' : ''}" data-section="integrations">
                <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                Integrations
              </a>
            </li>
          </ul>
        </nav>
        
        <!-- Settings Content -->
        <div class="settings-content">
          ${this.renderSection()}
        </div>
      </div>
    `;
  }
  
  /**
   * Renders the content for the currently active section
   * @returns {string} HTML string for the section content
   * @private
   */
  private renderSection(): string {
    // Render appropriate section based on active selection
    switch (this.activeSection) {
      case 'general':
        return this.renderGeneralSettings();
      case 'account':
        return this.renderAccountSettings();
      case 'notifications':
        return this.renderNotificationSettings();
      case 'integrations':
        return this.renderIntegrationSettings();
      default:
        return ''; // Fallback for unknown sections
    }
  }
  
  /**
   * Renders the general settings section
   * Includes company name, language, timezone, and date format options
   * @returns {string} HTML string for general settings form
   * @private
   */
  private renderGeneralSettings(): string {
    return `
      <div class="settings-section active">
        <h2 class="section-title">General Settings</h2>
        <p class="section-description">Configure your basic application preferences</p>
        
        <form class="settings-form" id="general-settings-form">
          <div class="form-group">
            <label for="company-name">Company Name</label>
            <input type="text" id="company-name" name="companyName" placeholder="Your Company Name" value="Acme Corp">
            <small>This will appear on invoices and reports</small>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="language">Language</label>
              <select id="language" name="language">
                <option value="en" selected>English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="timezone">Timezone</label>
              <select id="timezone" name="timezone">
                <option value="UTC" selected>UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="date-format">Date Format</label>
            <select id="date-format" name="dateFormat">
              <option value="MM/DD/YYYY" selected>MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="primary" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" class="secondary" data-action="cancel">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }
  
  /**
   * Renders the account settings section
   * Includes personal information fields and password change option
   * @returns {string} HTML string for account settings form
   * @private
   */
  private renderAccountSettings(): string {
    return `
      <div class="settings-section active">
        <h2 class="section-title">Account Settings</h2>
        <p class="section-description">Manage your personal account information</p>
        
        <form class="settings-form" id="account-settings-form">
          <div class="form-row">
            <div class="form-group">
              <label for="first-name">First Name</label>
              <input type="text" id="first-name" name="firstName" placeholder="John" value="John">
            </div>
            
            <div class="form-group">
              <label for="last-name">Last Name</label>
              <input type="text" id="last-name" name="lastName" placeholder="Doe" value="Doe">
            </div>
          </div>
          
          <div class="form-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="john@example.com" value="john@example.com">
            <small>We'll send important notifications to this address</small>
          </div>
          
          <div class="form-group">
            <label for="phone">Phone Number</label>
            <input type="tel" id="phone" name="phone" placeholder="+1 (555) 123-4567" value="+1 (555) 123-4567">
          </div>
          
          <div class="form-actions">
            <button type="submit" class="primary" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" class="secondary outline">Change Password</button>
          </div>
        </form>
      </div>
    `;
  }
  
  /**
   * Renders the notification preferences section
   * Includes toggles for various notification types
   * @returns {string} HTML string for notification settings form
   * @private
   */
  private renderNotificationSettings(): string {
    return `
      <div class="settings-section active">
        <h2 class="section-title">Notification Settings</h2>
        <p class="section-description">Choose how you want to receive notifications</p>
        
        <form class="settings-form" id="notification-settings-form">
          <div class="toggle-group">
            <div class="toggle-label">
              <span class="toggle-title">Email Notifications</span>
              <span class="toggle-description">Receive updates via email</span>
            </div>
            <input type="checkbox" role="switch" name="emailNotifications" checked>
          </div>
          
          <div class="toggle-group">
            <div class="toggle-label">
              <span class="toggle-title">Order Updates</span>
              <span class="toggle-description">Get notified about new orders and status changes</span>
            </div>
            <input type="checkbox" role="switch" name="orderUpdates" checked>
          </div>
          
          <div class="toggle-group">
            <div class="toggle-label">
              <span class="toggle-title">Inventory Alerts</span>
              <span class="toggle-description">Receive alerts when inventory is running low</span>
            </div>
            <input type="checkbox" role="switch" name="inventoryAlerts" checked>
          </div>
          
          <div class="toggle-group">
            <div class="toggle-label">
              <span class="toggle-title">Price Changes</span>
              <span class="toggle-description">Get notified about competitor price changes</span>
            </div>
            <input type="checkbox" role="switch" name="priceChanges">
          </div>
          
          <div class="toggle-group">
            <div class="toggle-label">
              <span class="toggle-title">Weekly Reports</span>
              <span class="toggle-description">Receive weekly performance summary</span>
            </div>
            <input type="checkbox" role="switch" name="weeklyReports" checked>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="primary" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    `;
  }
  
  /**
   * Renders the integrations settings section
   * Shows connected services and configuration options
   * Currently supports Amazon Seller Central integration
   * @returns {string} HTML string for integration settings form
   * @private
   */
  private renderIntegrationSettings(): string {
    return `
      <div class="settings-section active">
        <h2 class="section-title">Integrations</h2>
        <p class="section-description">Connect your external accounts and services</p>
        
        <div class="status-message info">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4m0-4h.01"></path>
          </svg>
          Amazon Seller Central integration is active
        </div>
        
        <form class="settings-form" id="integration-settings-form">
          <div class="form-group">
            <label for="seller-id">Amazon Seller ID</label>
            <input type="text" id="seller-id" name="sellerId" placeholder="A1234567890" value="A1234567890" readonly>
            <small>Connected on January 15, 2024</small>
          </div>
          
          <div class="form-group">
            <label for="marketplace">Primary Marketplace</label>
            <select id="marketplace" name="marketplace">
              <option value="US" selected>United States</option>
              <option value="CA">Canada</option>
              <option value="UK">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="IT">Italy</option>
              <option value="ES">Spain</option>
            </select>
          </div>
          
          <div class="toggle-group">
            <div class="toggle-label">
              <span class="toggle-title">Auto-sync Inventory</span>
              <span class="toggle-description">Automatically sync inventory levels every hour</span>
            </div>
            <input type="checkbox" role="switch" name="autoSyncInventory" checked>
          </div>
          
          <div class="toggle-group">
            <div class="toggle-label">
              <span class="toggle-title">Price Monitoring</span>
              <span class="toggle-description">Monitor competitor prices and send alerts</span>
            </div>
            <input type="checkbox" role="switch" name="priceMonitoring" checked>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="primary" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? 'Saving...' : 'Update Integration'}
            </button>
            <button type="button" class="secondary outline">Disconnect Account</button>
          </div>
        </form>
      </div>
    `;
  }
  
  /**
   * Attaches event listeners for navigation and form submissions
   * Sets up handlers for:
   * - Section navigation clicks
   * - Form submissions
   * - Cancel button actions
   * @override
   * @protected
   */
  protected override attachEventListeners(): void {
    // Navigation links - Handle section switching
    const navLinks = this.$$('.settings-nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        // Extract section from data attribute and update active section
        const section = (e.currentTarget as HTMLElement).dataset.section as SettingsSection;
        if (section) {
          this.activeSection = section;
          this.update(); // Re-render with new active section
        }
      });
    });
    
    // Form submissions - Handle save operations
    const forms = this.$$('form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(e.target as HTMLFormElement);
      });
    });
    
    // Cancel buttons - Discard changes
    const cancelButtons = this.$$('[data-action="cancel"]');
    cancelButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        logger.info('Settings cancelled');
        toast.info('Changes discarded');
      });
    });
  }
  
  /**
   * Lifecycle hook called when component is connected to the DOM
   * Logs the component initialization
   * @override
   * @protected
   */
  protected override onConnected(): void {
    logger.info('Settings page loaded');
  }
  
  /**
   * Handles form submission for any settings section
   * Validates form, simulates API call, and shows feedback
   * @param {HTMLFormElement} form - The form element being submitted
   * @private
   * @async
   * @todo Implement actual API integration for saving settings
   */
  private async handleFormSubmit(form: HTMLFormElement): Promise<void> {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    // Set loading state and update UI to show loading indicators
    this.loading = true;
    this.update();
    
    // Convert form data to plain object for API submission
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    logger.info('Settings form submitted', { 
      form: form.id, 
      data 
    });
    
    try {
      // Simulate API call - Replace with actual API integration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Actually save settings via API
      // Example: await api.put(`/settings/${this.activeSection}`, data);
      
      toast.success('Settings saved successfully!');
      logger.info('Settings saved', { section: this.activeSection });
    } catch (error) {
      logger.error('Failed to save settings', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      // Always reset loading state after operation completes
      this.loading = false;
      this.update();
    }
  }
}