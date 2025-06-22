/**
 * Base Component Class
 * All web components should extend this class for consistent behavior
 * Includes built-in FOUC prevention and lifecycle management
 */

export abstract class BaseComponent extends HTMLElement {
  protected shadow: ShadowRoot;
  private _isConnected: boolean = false;
  
  override constructor() {
    super();
    // Create shadow DOM
    this.shadow = this.attachShadow({ mode: 'open' });
    // Hide element until rendered to prevent FOUC
    this.style.visibility = 'hidden';
  }
  
  /**
   * Called when the element is added to the DOM
   */
  override connectedCallback(): void {
    this._isConnected = true;
    
    // Render the component
    this.render();
    
    // Attach event listeners after rendering
    this.attachEventListeners();
    
    // Show the component after next frame to ensure styles are applied
    requestAnimationFrame(() => {
      this.style.visibility = 'visible';
      this.onConnected();
    });
  }
  
  /**
   * Called when the element is removed from the DOM
   */
  override disconnectedCallback(): void {
    this._isConnected = false;
    this.removeEventListeners();
    this.onDisconnected();
  }
  
  /**
   * Called when observed attributes change
   */
  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue !== newValue && this._isConnected) {
      this.onAttributeChanged(name, oldValue, newValue);
      this.render();
      this.attachEventListeners();
    }
  }
  
  /**
   * Re-render the component
   */
  protected update(): void {
    if (this._isConnected) {
      this.render();
      this.attachEventListeners();
    }
  }
  
  /**
   * Dispatch a custom event
   */
  protected emit(eventName: string, detail?: any): void {
    this.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true
    }));
  }
  
  /**
   * Query an element in the shadow DOM
   */
  protected $(selector: string): Element | null {
    return this.shadow.querySelector(selector);
  }
  
  /**
   * Query all elements in the shadow DOM
   */
  protected $$(selector: string): NodeListOf<Element> {
    return this.shadow.querySelectorAll(selector);
  }
  
  /**
   * Abstract method - must be implemented by child classes
   * Renders the component's HTML
   */
  abstract render(): void;
  
  /**
   * Hook for attaching event listeners
   * Override in child classes
   */
  protected attachEventListeners(): void {
    // Override in child classes
  }
  
  /**
   * Hook for removing event listeners
   * Override in child classes
   */
  protected removeEventListeners(): void {
    // Override in child classes
  }
  
  /**
   * Hook called after the component is connected and rendered
   * Override in child classes
   */
  protected onConnected(): void {
    // Override in child classes
  }
  
  /**
   * Hook called when the component is disconnected
   * Override in child classes
   */
  protected onDisconnected(): void {
    // Override in child classes
  }
  
  /**
   * Hook called when an attribute changes
   * Override in child classes
   */
  protected onAttributeChanged(_name: string, _oldValue: string | null, _newValue: string | null): void {
    // Override in child classes
  }
  
  /**
   * Load a CSS file for the component
   * Returns a CSSStyleSheet that can be adopted
   */
  protected async loadStyles(cssPath: string): Promise<CSSStyleSheet> {
    const response = await fetch(cssPath);
    const css = await response.text();
    const sheet = new CSSStyleSheet();
    await sheet.replace(css);
    return sheet;
  }
  
  /**
   * Create a CSSStyleSheet from a string
   */
  protected createStyleSheet(css: string): CSSStyleSheet {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    return sheet;
  }
}