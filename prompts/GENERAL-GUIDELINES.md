# Project Guidelines

This document defines the tech stack, architectural principles, and coding standards.

## 🛠 Core Tech Stack

| Layer    | Choice & Notes                                                   |
| -------- | ---------------------------------------------------------------- |
| Runtime  | **Bun 1.x** – ESM, hot reload, built‑in test runner              |
| Language | **TypeScript 5** targeting `es2022`                              |
| Database | **Postgres + pgvector** via Bun's native `sql` client            |
| ORM      | **Drizzle** – pure TS, zero build                                |
| Auth     | **Lucia** – fetch‑based middleware only                          |
| UI       | **HTML + HTMX + Web Components** shipped as ES modules           |
| Styling  | CDN CSS (**Picocss**) – no tooling                               |
| Dev Ops  | Docker (`oven/bun` image) deploying to a debian server           |

## 📂 Recommended Folder Layout

```text
my‑saas/
├─ backend/                    ← More details on BACKEND-GUIDELINES.md
├─ static/
│  ├─ util.css                 ← hand‑rolled utility classes
│  └─ images/                  ← logo, hero, etc.
├─ dev/                        ← Claude scaffolder for development
│  ├─ bug-fix.ts               ← For fixing bugs
│  ├─ new-feature.ts           ← To implement new features
│  ├─ improve-feature.ts       ← To improve existing features
│  ├─ new-job.ts               ← To create new job/scheduler/worker
│  └─ generate-docs.ts         ← To generate specific docs
├─ docs/                       ← documentation about the project
├─ frontend/                   ← More details on FRONTEND-GUIDELINES.md
├─ infra/                      ← 
├─ prompts/                    ← prompt snippets for Claude
├─ scripts/
│  ├─ dev.sh                   ← To run project in development
│  └─ prod.sh                  ← To run project in production
├─ tests/                      ← bun test specs
├─ worker/                     ← 
├─ .env.example
├─ .env.local
├─ .gitignore
└─ README.md
```

## Critical Development Rules

### ALWAYS FOLLOW THESE RULES:

0. **ENGLISH ONLY** - All code comments, documentation, commit messages, and any text in the codebase MUST be in English. This ensures global collaboration and maintainability.

1. **NO MOCK DATA** - Never use mock or fake data unless explicitly asked. Always implement with real data sources.

2. **NO SIMULATED FEATURES** - Never simulate or fake functionality. Implement real, working features.

3. **REAL IMPLEMENTATIONS ONLY** - Every feature must work with real data and real integrations.

4. **CODE DOCUMENTATION** - For complex files and functions, add clear comments IN ENGLISH explaining:
   - What the code does
   - How it works
   - Why design decisions were made
   - Any important context for future developers

5. **NO HARDCODED VALUES** - NEVER hardcode any configuration values, especially:
   - Database connections and ports
   - API URLs and ports
   - Redis connections and ports
   - Any Docker service ports
   - Credentials, API keys, or secrets

   Always use environment variables:
   - ❌ WRONG: `host: 'localhost:5432'`
   - ❌ WRONG: `database: process.env.POSTGRES_DB || 'myapp'`
   - ✅ CORRECT: `host: process.env.DB_HOST`
   - ✅ CORRECT: `port: parseInt(process.env.DB_PORT)`
   - ✅ CORRECT: `database: process.env.DB_NAME`

6. **SECURITY FIRST** - Always validate inputs, sanitize data, and follow security best practices.

7. **TYPE SAFETY** - Maintain strict TypeScript types. Use Zod schemas for runtime validation.

8. **ALWAYS USE BUN INSIDE DOCKER** - For all operations.

## Key Concepts and Best Practices

### Environment Configuration

**IMPORTANT**: Always use `.env.local` for local development, NEVER use `.env`
- `.env.local` is gitignored by default
- `.env` might accidentally be committed
- Use `.env.example` for documenting required variables

### Environment Management

* All configuration via environment variables (`.env.local` for dev, `.env.production` for prod)
* Always use SSL in production - no HTTP-only option
* Nginx templates processed at runtime with environment variables

### Development Standards

- Everything runs in Docker containers - no local runtime dependencies
- Strict TypeScript with no implicit any
- All inputs validated with Zod schemas
- Comprehensive error handling and logging
- Security-first approach in all implementations

### Documentation Requirements

- Maintain `.env.example` with all required variables
- Document API endpoints with OpenAPI/Swagger
- Keep README.md updated with setup instructions
- Add inline comments for complex logic
- Document architectural decisions in `/docs`