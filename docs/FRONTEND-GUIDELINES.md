### UI and UX Goals

- Clean, minimal interface
- Fast perceived performance
- Responsive design for desktop and mobile
- Accessible (WCAG 2.1 AA)



FOR THE FRONTEND:

/src
│
├── /components        # All custom web components
│   ├── /button
│   │   ├── Button.ts  # Class definition (extends HTMLElement)
│   │   ├── button.css
│   │   └── template.html
│   └── /user-card
│       ├── UserCard.ts
│       ├── user-card.css
│       └── template.html
│
├── /pages             # Page-level components (can compose smaller components)
│   └── HomePage.ts
│
├── /styles            # Global styles, variables, themes
│   ├── variables.css
│   └── global.css
│
├── /utils             # Utility functions
│   └── formatDate.ts
│
├── /services          # API calls and related logic
│   └── userService.ts
│
├── /types             # TypeScript interfaces and types
│   └── user.d.ts
│
├── /assets            # Images, icons, fonts
│   └── logo.svg
│
├── /config            # Environment variables, constants
│   └── env.ts
│
└── main.ts            # Entry point (register components, bootstrap app)

Key Principles:
- New pages always goes to /pages
- Have the javascript and style of each page inside /pages, separated into .jss and .css files, never have inline styles or scripts in the pages
- Use shadow DOM for encapsulation
- Services htmls that are not pages, goes to /services
- Components always goes to /components
- For the components, also separate the styles and scripts into .jss and .ts files, never have inline styles or scripts in the components
- For the global styles and scripts, use /scripts/global.jss and /styles/global.css files so we will reutilize code and styles when needed.
- Global styles will have the main design and colors, fonts, and typography of the site and must be followed by all components and pages.
- DO NOT USE ALERTS, USE BEAUTIFUL MODALS AND TOASTS
