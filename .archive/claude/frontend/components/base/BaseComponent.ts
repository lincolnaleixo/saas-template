/**
 * Base component class with built-in FOUC prevention
 * All web components should extend this class
 */
export abstract class BaseComponent extends HTMLElement {
  protected shadow: ShadowRoot;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    // Hide component until rendered to prevent FOUC
    this.style.visibility = 'hidden';
  }
  
  connectedCallback() {
    this.render();
    // Show component after rendering
    requestAnimationFrame(() => {
      this.style.visibility = 'visible';
    });
  }
  
  disconnectedCallback() {
    // Override in child classes for cleanup
  }
  
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    // Override in child classes to handle attribute changes
  }
  
  /**
   * Abstract method that child components must implement
   * This is where the component's HTML structure is defined
   */
  abstract render(): void;
  
  /**
   * Helper method to dispatch custom events
   */
  protected emit(eventName: string, detail?: any) {
    this.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true,
    }));
  }
  
  /**
   * Helper method to safely query elements in shadow DOM
   */
  protected $(selector: string): Element | null {
    return this.shadow.querySelector(selector);
  }
  
  /**
   * Helper method to safely query all elements in shadow DOM
   */
  protected $$(selector: string): NodeListOf<Element> {
    return this.shadow.querySelectorAll(selector);
  }
}