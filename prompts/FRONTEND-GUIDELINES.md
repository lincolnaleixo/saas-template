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
│   ├── global.css       # Base styles
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
└── main.ts              # Entry point
```

## 🧩 Web Components Architecture

### Component Development Rules

1. **Component Structure**
   ```typescript
   // components/button/Button.ts
   export class AppButton extends HTMLElement {
     private shadow: ShadowRoot;
     
     constructor() {
       super();
       this.shadow = this.attachShadow({ mode: 'open' });
     }
     
     connectedCallback() {
       this.render();
       this.attachEventListeners();
     }
     
     render() {
       const template = document.createElement('template');
       template.innerHTML = `
         <link rel="stylesheet" href="/frontend/components/button/button.css">
         ${this.getTemplate()}
       `;
       this.shadow.appendChild(template.content.cloneNode(true));
     }
     
     getTemplate(): string {
       // Load from template.html or define here
     }
   }
   
   customElements.define('app-button', AppButton);
   ```

2. **Style Encapsulation**
   - Use Shadow DOM for component encapsulation
   - Never use inline styles in components
   - Component styles go in dedicated `.css` files
   - Global styles inherited through CSS custom properties

3. **Page Components**
   - Pages are special components in `/pages`
   - Each page has its own `.ts` and `.css` files
   - Pages can compose smaller components
   - Pages handle routing and data fetching

## 🎯 Frontend Standards

### HTMX Integration

```html
<!-- Use HTMX for dynamic updates -->
<button hx-post="/api/users" 
        hx-target="#user-list" 
        hx-swap="beforeend"
        hx-indicator="#spinner">
  Add User
</button>

<!-- Progressive enhancement -->
<form action="/api/users" method="POST" hx-boost="true">
  <!-- Form works with or without JavaScript -->
</form>
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

## 🎨 Design System

### CSS Architecture

1. **Global Variables** (`styles/variables.css`)
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
   }
   ```

2. **Component Styling Rules**
   - Mobile-first responsive design
   - Use CSS custom properties for theming
   - Prefer CSS Grid and Flexbox for layouts
   - Semantic class names (BEM-like)

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

1. **Loading Strategy**
   - Lazy load components with dynamic imports
   - Preload critical CSS
   - Use resource hints (prefetch, preconnect)

2. **Bundle Optimization**
   - ES modules for tree-shaking
   - Code splitting by route
   - Minify CSS and JS in production

3. **Image Optimization**
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