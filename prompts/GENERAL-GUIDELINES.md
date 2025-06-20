# Project Guidelines

This document defines the tech stack, architectural principles, and coding standards.

## 🛠 Core Tech Stack

| Layer    | Choice & Notes                                                   |
| -------- | ---------------------------------------------------------------- |
| Runtime  | **Bun 1.x** – ESM, hot reload, built‑in test runner              |
| Language | **TypeScript 5** targeting `es2022`                              |
| Database | **Postgres + pgvector** via Bun`s native `sql\` client           |
| ORM      | **Drizzle** – pure TS, zero build                                |
| Auth     | **Lucia** – fetch‑based middleware only                          |
| UI       | **HTML + HTMX + Web Components** shipped as ES modules           |
| Styling  | CDN CSS (**Picocss**) – no tooling                               |
| Dev Ops  | Docker (`oven/bun` image) deploying to Fly.io, Railway or Render |

## 📂 Recommended Folder Layout

````text
my‑saas/
├─ backend/                    ← More details on BACKEND-GUIDELINES.md
├─ static/
│  ├─ util.css                 ← hand‑rolled utility classes
│  └─ images/                  ← logo, hero, etc.
├─ dev/                        ← Claude scaffolder for development
│  ├─ fix-bugs.ts              ← For fixing bugs
│  ├─ new-feature.ts           ← To implement new features
│  ├─ improve-feature.ts       ← To improve existant features
│  ├─ generate-docs.ts         ← To generate specific docs
├─ docs/                       ← documentation about the project
├─ frontend/                   ← More details on FRONTEND-GUIDELINES.md
├─ prompts/                    ← prompt snippets for Claude
├─ scripts/
│  ├─ dev.sh                   ← To run project in development
│  ├─ prod.sh                  ← To run project in production
├─ tests/                      ← bun test specs
├─ .env.example
├─ .env.local
├─ .gitignore
├─ README.md
````

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

8. **ALWAYS USE BUN** - For all operations:
    - Use `bun` for package management, NOT `npm` or `yarn`
    - Use `bun run` for scripts, NOT `npm run` or `node`
    - Use `bun install` for dependencies, NOT `npm install`
    - All scripts should have `#!/usr/bin/env bun` shebang

## Key Concepts and Best Practices

### Environment Configuration

**IMPORTANT**: Always use `.env.local` for local development, NEVER use `.env`
- `.env.local` is gitignored by default
- `.env` might accidentally be committed
- Use `.env.example` for documenting required variables

```bash
# .env.local (NEVER .env)
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myapp"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# Other services
SMTP_HOST="smtp.example.com"
```

## Docker Port Configuration

### Environment Variables for Ports

All Docker service ports MUST be configurable via environment variables to support multiple deployments on the same server:

```bash
# Database Ports
DB_PORT=5432                    # PostgreSQL port
PGADMIN_PORT=5050              # pgAdmin UI port

# Redis Ports
REDIS_PORT=6379                # Redis server port
REDIS_INSIGHT_PORT=8001        # RedisInsight UI port

# Application Ports
API_PORT=8000                  # Backend API port
FRONTEND_PORT=3000             # Next.js frontend port
BULL_BOARD_PORT=3001           # Bull Board UI port

# Development Tool Ports
MAILDEV_PORT=1080              # MailDev UI port
MAILDEV_SMTP_PORT=1025         # MailDev SMTP port
STORYBOOK_PORT=6006            # Storybook port

# Nginx Ports (Production)
NGINX_HTTP_PORT=80             # HTTP port
NGINX_HTTPS_PORT=443           # HTTPS port
```

### Usage in Code

**Always use environment variables for connections:**

```typescript
// ❌ WRONG - Hardcoded ports
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'myapp'
};

// ✅ CORRECT - Environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME
};

// ❌ WRONG - Hardcoded Redis URL
const redis = new Redis('redis://localhost:6379');

// ✅ CORRECT - Environment variable
const redis = new Redis(process.env.REDIS_URL);
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  db:
    ports:
      - "${DB_PORT:-5432}:5432"
    environment:
      POSTGRES_PORT: ${DB_PORT:-5432}

  redis:
    ports:
      - "${REDIS_PORT:-6379}:6379"

  api:
    ports:
      - "${API_PORT:-8000}:8000"
    environment:
      PORT: ${API_PORT:-8000}
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/${DB_NAME}
      REDIS_URL: redis://redis:${REDIS_PORT:-6379}
```

## Development & Deployment Principles

### Docker Standards

* Container logs must include timestamps: `YYYYMMDD-HHMMSS [level] message`
* Image naming convention: `myapp-service` (e.g., `myapp-api`, `myapp-db`)
* Project isolation: scripts must only manage project-specific containers
* Everything runs in containers - no local dependencies

### Environment Management

* Development: `./scripts/dev.sh` with hot reload and log tailing
* Production: `./scripts/prod.sh` with optimized builds and SSL/nginx
* All configuration via environment variables (`.env.local` for dev, `.env.production` for prod)
* Always use SSL in production - no HTTP-only option
* Nginx templates processed at runtime with environment variables

### Environment Variables Best Practices

1. **Never use fallback values in production code**
   ```typescript
   // ❌ WRONG
   const apiUrl = process.env.API_URL || 'http://localhost:8000';

   // ✅ CORRECT
   const apiUrl = process.env.API_URL;
   if (!apiUrl) {
     throw new Error('API_URL environment variable is required');
   }
   ```

2. **Validate required environment variables at startup**
   ```typescript
   // src/config/env.validation.ts
   const requiredEnvVars = [
     'DATABASE_URL',
     'REDIS_URL',
     'API_PORT',
     'AUTH_SECRET'
   ];

   for (const envVar of requiredEnvVars) {
     if (!process.env[envVar]) {
       throw new Error(`Missing required environment variable: ${envVar}`);
     }
   }
   ```

3. **Use type-safe environment variable access**
   ```typescript
   // src/config/env.ts
   export const env = {
     database: {
       url: process.env.DATABASE_URL!,
       port: parseInt(process.env.DB_PORT!),
     },
     redis: {
       url: process.env.REDIS_URL!,
       port: parseInt(process.env.REDIS_PORT!),
     },
     api: {
       port: parseInt(process.env.API_PORT!),
       url: process.env.NEXT_PUBLIC_API_URL!,
     },
   } as const;
   ```

4. **Document all environment variables**
   - Maintain `.env.example` with all variables and descriptions
   - Include type, format, and valid values
   - Mark required vs optional variables
   - Provide secure default generation commands