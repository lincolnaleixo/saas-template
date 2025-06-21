# Frontend Guidelines

This document covers frontend-specific architecture, web components design, and UI/UX standards.

> **Note**: For general project guidelines and tech stack, see GENERAL-GUIDELINES.md

## 🎨 UI/UX Principles

| Principle | Description |
| --------- | ----------- |
| **Minimal Design** | Clean, uncluttered interface with focus on content |
| **Performance First** | Fast perceived performance with optimistic UI updates |
| **Responsive** | Mobile-first design that scales to desktop |
| **Accessible** | WCAG 2.1 AA compliance for all components |
| **Progressive Enhancement** | Core functionality works without JavaScript |
| **PicoCSS Framework** | Use PicoCSS via CDN for consistent, semantic styling |

## 📁 Frontend Structure

```text
frontend/
├── components/          # Reusable web components
│   ├── button/
│   │   ├── Button.ts    # Class definition (extends HTMLElement)
│   │   ├── button.css   # Component-specific styles
│   │   └── template.html # Component template
│   ├── modal/
│   │   ├── Modal.ts
│   │   ├── modal.css
│   │   └── template.html
│   └── toast/
│       ├── Toast.ts
│       ├── toast.css
│       └── template.html
├── pages/               # Page-level components
│   ├── HomePage.ts
│   ├── home-page.css
│   ├── DashboardPage.ts
│   └── dashboard-page.css
├── styles/              # Global styles and themes
│   ├── variables.css    # CSS custom properties
│   ├── global.css       # Base styles + FOUC prevention
│   └── typography.css   # Font definitions
├── scripts/             # Global scripts
│   └── global.js        # Shared utilities
├── services/            # API calls and business logic
│   ├── api.service.ts   # Base API client
│   ├── user.service.ts  # User-related API calls
│   └── auth.service.ts  # Authentication logic
├── types/               # TypeScript definitions
│   ├── api.d.ts
│   └── user.d.ts
├── utils/               # Helper functions
│   ├── formatters.ts    # Date, number formatters
│   └── validators.ts    # Form validation helpers
├── assets/              # Static resources
│   ├── images/
│   ├── icons/
│   └── fonts/
├── config/              # Frontend configuration
│   └── env.ts           # Environment variables
├── base/                # Base classes
│   └── BaseComponent.ts # Base web component with FOUC prevention
└── main.ts              # Entry point
```

## 🧩 Web Components Architecture

### Component Development Rules

1. **Use BaseComponent for FOUC Prevention**
   ```typescript
   // components/button/Button.ts
   import { BaseComponent } from '../base/BaseComponent';
   
   // Create styles once, reuse for all instances
   const styles = new CSSStyleSheet();
   styles.replaceSync(`
     :host {
       display: inline-block;
     }
     /* Component styles */
   `);
   
   export class AppButton extends BaseComponent {
     constructor() {
       super();
       this.shadow.adoptedStyleSheets = [styles];
     }
     
     render() {
       this.shadow.innerHTML = `
         <button><slot></slot></button>
       `;
       this.attachEventListeners();
     }
     
     private attachEventListeners() {
       const button = this.shadow.querySelector('button');
       button?.addEventListener('click', this.handleClick.bind(this));
     }
     
     private handleClick(e: Event) {
       // Handle click
     }
   }
   
   customElements.define('app-button', AppButton);
   ```

2. **CSS File Standards**
   ```typescript
   // components/card/Card.ts
   import { BaseComponent } from '../base/BaseComponent';
   
   // Load CSS properly - NO inline styles!
   const cardStyles = new CSSStyleSheet();
   
   // Option 1: Import CSS file content (requires bundler)
   import cardCSS from './card.css';
   cardStyles.replaceSync(cardCSS);
   
   // Option 2: Fetch CSS file
   fetch('/frontend/components/card/card.css')
     .then(r => r.text())
     .then(css => cardStyles.replaceSync(css));
   
   // Option 3: Define in separate constant (but still no inline)
   const styles = `
     :host {
       /* Styles here, but prefer separate .css file */
     }
   `;
   cardStyles.replaceSync(styles);
   ```

3. **Style Encapsulation**
   - Use Shadow DOM for component encapsulation
   - **NEVER use inline styles** in components
   - Component styles go in dedicated `.css` files
   - PicoCSS styles inherited in light DOM
   - Custom properties pierce Shadow DOM

4. **Page Components**
   - Pages are special components in `/pages`
   - Each page has **separate** `.ts` and `.css` files
   - Pages use PicoCSS containers and grids
   - Pages handle routing and data fetching

## 🎯 Frontend Standards

### HTMX Integration with PicoCSS

```html
<!-- HTMX + PicoCSS semantic HTML -->
<article>
  <header>
    <h3>Users</h3>
  </header>
  
  <!-- PicoCSS button with HTMX -->
  <button hx-post="/api/users" 
          hx-target="#user-list" 
          hx-swap="beforeend"
          hx-indicator="#spinner"
          class="contrast">
    Add User
  </button>
  
  <!-- PicoCSS form with HTMX progressive enhancement -->
  <form action="/api/users" method="POST" hx-boost="true">
    <input type="text" name="name" placeholder="Name" required>
    <button type="submit">Submit</button>
  </form>
  
  <div id="user-list" role="group">
    <!-- PicoCSS cards for users -->
  </div>
</article>
```

### State Management

- Use HTMX for server-driven state
- Local state in web components via properties
- Session state in sessionStorage
- Persistent state via API calls

### API Integration

```typescript
// services/api.service.ts
export class ApiService {
  private baseUrl = process.env.API_URL;
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    
    return response.json();
  }
}
```

### Error Handling & User Feedback

**IMPORTANT: NO ALERTS - Use beautiful modals and toasts**

```typescript
// components/toast/Toast.ts
export class AppToast extends HTMLElement {
  show(message: string, type: 'success' | 'error' | 'info') {
    // Beautiful toast implementation
  }
}

// Usage
const toast = document.querySelector('app-toast');
toast.show('User created successfully', 'success');
```

### Logging Standards

**MANDATORY: Use the project logger for ALL logging needs**

```typescript
// ❌ NEVER use console methods
console.log('Component rendered');
console.error('API error:', error);
console.warn('Slow network detected');
console.debug('Form data:', formData);

// ✅ ALWAYS use the logger
import { logger, createLogger } from '@/frontend/lib/logger';

// Use default logger
logger.info('Component rendered', { component: 'UserList' });
logger.error('API request failed', error);
logger.warn('Slow network detected', { latency: 2000 });
logger.debug('Form submitted', { fields: Object.keys(formData) });

// Create component-specific logger
const componentLogger = createLogger({ 
  source: 'UserProfile',
  context: { component: 'UserProfile' }
});
componentLogger.info('Profile loaded', { userId });

// Logger features for frontend:
// - Logs appear in browser console with colors and formatting
// - Logs are stored in localStorage for debugging
// - Can send logs to backend for monitoring
// - Set log level with ?log_level=debug in URL
```

**Frontend Logger Benefits:**
- Persistent logs in localStorage survive page reloads
- Debug user issues by retrieving their logs
- Monitor frontend errors in production
- Filter logs by component or level
- Beautiful console output with collapsed objects

## 🎨 Design System

### PicoCSS Integration

**We use PicoCSS as our CSS framework** - loaded via CDN for zero build complexity:

```html
<!-- In your HTML head -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
```

### CSS Organization Standards

**IMPORTANT CSS RULES:**

1. **NO INLINE STYLES** - Never write styles in HTML or JavaScript
2. **Separate CSS Files** - Each component/page has its own `.css` file
3. **Global Styles** - Shared styles go in `/styles/global.css`
4. **Component Styles** - Component-specific styles in component folders
5. **Use CSS Variables** - Extend PicoCSS with custom properties

### File Organization

```text
/* CORRECT - Separated CSS files */
frontend/
├── components/
│   └── button/
│       ├── Button.ts        # NO inline styles here
│       └── button.css       # ALL button styles here
├── pages/
│   ├── HomePage.ts          # NO inline styles here
│   └── home-page.css        # ALL page styles here
└── styles/
    ├── global.css           # Global overrides and utilities
    └── variables.css        # Custom CSS variables

/* WRONG - Inline styles */
// ❌ NEVER do this in Button.ts:
this.shadow.innerHTML = `
  <button style="color: red;">Click</button>
`;

// ✅ CORRECT - Use CSS file:
this.shadow.adoptedStyleSheets = [buttonStyles];
```

### CSS Architecture

1. **PicoCSS Base + Custom Variables** (`styles/variables.css`)
   ```css
   :root {
     /* Colors */
     --color-primary: #007bff;
     --color-secondary: #6c757d;
     --color-success: #28a745;
     --color-danger: #dc3545;
     
     /* Typography */
     --font-family-base: system-ui, -apple-system, sans-serif;
     --font-size-base: 16px;
     --line-height-base: 1.5;
     
     /* Spacing */
     --spacing-xs: 0.25rem;
     --spacing-sm: 0.5rem;
     --spacing-md: 1rem;
     --spacing-lg: 1.5rem;
     --spacing-xl: 3rem;
     
     /* Breakpoints */
     --breakpoint-sm: 576px;
     --breakpoint-md: 768px;
     --breakpoint-lg: 992px;
     --breakpoint-xl: 1200px;
     
     /* Skeleton Loading */
     --skeleton-bg: #e9ecef;
     --skeleton-shine: #f8f9fa;
   }
   ```

2. **Global Styles** (`styles/global.css`)
   ```css
   /* PicoCSS overrides and custom utilities */
   @import './variables.css';
   
   /* FOUC Prevention - MUST be in global.css */
   :not(:defined) {
     visibility: hidden;
   }
   
   /* Extend PicoCSS with custom utilities */
   .text-center { text-align: center; }
   .mt-auto { margin-top: auto; }
   .mb-0 { margin-bottom: 0; }
   
   /* Custom component defaults */
   app-header { display: block; }
   app-footer { display: block; }
   ```

3. **Skeleton Loading Styles** (`styles/global.css`)
   ```css
   /* Skeleton loading animation */
   .skeleton {
     background: var(--skeleton-bg);
     position: relative;
     overflow: hidden;
   }
   
   .skeleton::after {
     content: '';
     position: absolute;
     top: 0;
     right: 0;
     bottom: 0;
     left: 0;
     background: linear-gradient(
       90deg,
       transparent,
       var(--skeleton-shine),
       transparent
     );
     animation: skeleton-loading 1.5s infinite;
   }
   
   @keyframes skeleton-loading {
     0% { transform: translateX(-100%); }
     100% { transform: translateX(100%); }
   }
   
   .skeleton-line {
     height: 1em;
     margin-bottom: 0.5em;
     border-radius: 4px;
   }
   
   .skeleton-line.short {
     width: 60%;
   }
   ```

### Component Styling Best Practices

1. **PicoCSS First** - Use PicoCSS classes before writing custom CSS
   ```html
   <!-- Use PicoCSS semantic HTML -->
   <article>
     <header>
       <h2>Title</h2>
     </header>
     <p>Content uses PicoCSS typography automatically</p>
     <footer>
       <button class="secondary">PicoCSS Button</button>
     </footer>
   </article>
   ```

2. **Component CSS Rules**
   ```css
   /* component/button/button.css */
   :host {
     /* Component wrapper styles */
     display: inline-block;
   }
   
   /* Extend PicoCSS styles, don't override */
   button {
     /* Inherits PicoCSS button styles */
     /* Add only what's unique to this component */
   }
   ```

3. **Page-Level Styles**
   ```css
   /* pages/home-page.css */
   :host {
     display: block;
     /* Use PicoCSS container and grid */
   }
   
   .hero {
     /* Custom hero section extending PicoCSS */
   }
   ```

4. **Styling Rules**
   - Let PicoCSS handle base styles
   - Use semantic HTML for automatic styling
   - Add custom styles only when needed
   - Mobile-first responsive design
   - Use CSS custom properties for theming
   - Prefer CSS Grid and Flexbox for layouts

### Responsive Design

```css
/* Mobile-first approach */
.component {
  /* Mobile styles (default) */
  padding: var(--spacing-sm);
}

@media (min-width: 768px) {
  .component {
    /* Tablet and up */
    padding: var(--spacing-md);
  }
}

@media (min-width: 1200px) {
  .component {
    /* Desktop */
    padding: var(--spacing-lg);
  }
}
```

## ⚡ Performance Guidelines

### Preventing Flash of Unstyled Content (FOUC)

Web components can show a "flash" while loading. Here's how we prevent it:

1. **Hide Undefined Elements** (`styles/global.css`)
   ```css
   /* Hide all custom elements until they're defined */
   :not(:defined) {
     visibility: hidden;
   }
   
   /* Optional: Smooth fade-in for all components */
   body {
     opacity: 0;
     transition: opacity 0.3s ease-in-out;
   }
   body.components-ready {
     opacity: 1;
   }
   ```

2. **Component Registration Order** (`main.ts`)
   ```typescript
   // Import all components BEFORE any other logic
   import './components/button/Button';
   import './components/modal/Modal';
   import './components/toast/Toast';
   
   // Wait for critical components to be defined
   async function initializeApp() {
     await Promise.all([
       customElements.whenDefined('app-button'),
       customElements.whenDefined('app-modal'),
       customElements.whenDefined('app-toast')
     ]);
     
     // Show the app
     document.body.classList.add('components-ready');
   }
   
   initializeApp();
   ```

3. **Base Component with Built-in FOUC Prevention**
   ```typescript
   // components/base/BaseComponent.ts
   export abstract class BaseComponent extends HTMLElement {
     protected shadow: ShadowRoot;
     
     constructor() {
       super();
       this.shadow = this.attachShadow({ mode: 'open' });
       // Hide until rendered
       this.style.visibility = 'hidden';
     }
     
     connectedCallback() {
       this.render();
       // Show after next frame to ensure styles are applied
       requestAnimationFrame(() => {
         this.style.visibility = 'visible';
       });
     }
     
     abstract render(): void;
   }
   ```

4. **Constructable Stylesheets for Instant Styles**
   ```typescript
   // components/button/Button.ts
   const buttonStyles = new CSSStyleSheet();
   buttonStyles.replaceSync(`
     :host {
       display: inline-block;
       /* Component styles available immediately */
     }
     button {
       padding: var(--spacing-sm) var(--spacing-md);
       background: var(--color-primary);
       color: white;
       border: none;
       border-radius: 4px;
       cursor: pointer;
     }
   `);
   
   export class AppButton extends BaseComponent {
     constructor() {
       super();
       // Styles applied instantly, no external CSS loading
       this.shadow.adoptedStyleSheets = [buttonStyles];
     }
     
     render() {
       this.shadow.innerHTML = `
         <button><slot></slot></button>
       `;
     }
   }
   ```

### Loading Optimization

1. **Module Preloading**
   ```html
   <!-- In your HTML head -->
   <link rel="modulepreload" href="/frontend/main.js">
   <link rel="modulepreload" href="/frontend/components/index.js">
   ```

2. **Critical CSS Inlining**
   ```html
   <!-- Inline critical styles in <head> -->
   <style>
     /* Only the essential above-the-fold styles */
     :not(:defined) { visibility: hidden; }
     body { margin: 0; font-family: var(--font-family-base); }
     /* Component placeholders to prevent layout shift */
     app-header { display: block; height: 60px; }
     app-hero { display: block; min-height: 400px; }
   </style>
   ```

3. **Skeleton Loading States**
   ```typescript
   // components/card/Card.ts
   export class AppCard extends BaseComponent {
     render() {
       // Show skeleton immediately
       this.shadow.innerHTML = `
         <div class="skeleton">
           <div class="skeleton-line"></div>
           <div class="skeleton-line short"></div>
         </div>
       `;
       
       // Load actual content
       this.loadContent();
     }
     
     async loadContent() {
       const data = await this.fetchData();
       this.shadow.innerHTML = `
         <article>
           <h3>${data.title}</h3>
           <p>${data.content}</p>
         </article>
       `;
     }
   }
   ```

### Bundle Optimization

- ES modules for tree-shaking
- Code splitting by route
- Minify CSS and JS in production
- Use Bun's fast bundling for development

### Image Optimization

- Use WebP with fallbacks
- Responsive images with srcset
- Lazy load below-the-fold images

## 🔒 Security Practices

1. **XSS Prevention**
   - Always escape user content
   - Use textContent instead of innerHTML
   - Sanitize HTML when necessary

2. **CSRF Protection**
   - Include CSRF tokens in forms
   - Validate on server side

3. **Content Security Policy**
   - Define strict CSP headers
   - No inline scripts or styles

## 📱 Accessibility Checklist

- [ ] Semantic HTML elements
- [ ] ARIA labels where needed
- [ ] Keyboard navigation support
- [ ] Focus indicators visible
- [ ] Color contrast ratios meet WCAG
- [ ] Screen reader tested
- [ ] Reduced motion support

## 🧪 Frontend Testing

```typescript
// tests/components/button.test.ts
import { AppButton } from '@/frontend/components/button/Button';

describe('AppButton', () => {
  test('renders with correct text', () => {
    const button = new AppButton();
    button.textContent = 'Click me';
    document.body.appendChild(button);
    
    const shadowButton = button.shadowRoot.querySelector('button');
    expect(shadowButton.textContent).toBe('Click me');
  });
});
```