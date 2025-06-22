# Project Guidelines

This document defines the tech stack, architectural principles, and coding standards.
For development workflows and operational procedures, see `workflow.md`.

## Tech Stack Overview

| Layer      | Technology                                                               |
| ---------- | ------------------------------------------------------------------------ |
| Frontend   | Next.js 15 with Server Components, Tailwind CSS, shadcn/ui             |
| API        | Server Components + tRPC v11 router with Zod schemas                    |
| Database   | PostgreSQL 16 with Drizzle ORM                                         |
| Cache      | Redis 7 for sessions, rate limits, and BullMQ job queues              |
| Worker     | BullMQ with dedicated worker process for background jobs                |
| Auth       | Lucia for authentication                                                |
| Container  | Docker Compose with separate services                                   |

## Frontend

* Next.js 15 (App Router and Server Components)
* Tailwind CSS 4 + shadcn/ui + Radix UI primitives
* TanStack Query v5 for client side data cache
* React Hook Form + Zod resolver for forms
* Lucide icons
* Optional Storybook for component documentation

### UI and UX Goals

- Clean, minimal interface
- Fast perceived performance
- Responsive design for desktop and mobile
- Accessible (WCAG 2.1 AA)

## Backend API

* Server Components for queries and reads
* tRPC v11 router for typed mutations and complex logic
* Drizzle ORM 2 with PostgreSQL
* Zod 4 validation co located with each route or procedure
* Lucia for authentication

### API Design Principles

* **Keep routers thin** - tRPC routers should only handle request/response, delegate business logic to services
* **Services contain business logic** - All complex operations belong in service files
* **One service per feature** - Each feature has its own service file with related operations
* **Direct database access in Server Components** - For simple reads, Server Components can query DB directly

## Database

* PostgreSQL 16 container is the system of record
* Optional Turso edge SQLite container for ultra low latency or offline first features

### Database Principles

* **ALL project credentials and data are stored in PostgreSQL** - No local files or in-memory storage
* **Database persists between Docker restarts** - Data volumes ensure continuity
* **No data is stored in memory or files** - Everything goes to the database for persistence
* Migrations are version-controlled and never edited after creation
* Schema changes are automatically tracked via SHA-256 hashing
* Every database backup is correlated with git commit and schema version
* All migrations run in transactions with automatic rollback on failure
* See `workflow.md` for detailed migration procedures

## Cache and Job Queue

* Redis 7 container for:

  * Ephemeral caching (sessions, rate limits)
  * BullMQ backed queues for background jobs
  * Pub / sub events if needed
* Queue logic lives in `/worker` with separate `worker/index.ts` entry

## Scheduler and Multi-Tenant Sync

* Each user gets a dedicated BullMQ repeatable job (`sync-user-<id>`) with custom cron based on their plan
* Each job includes user context (Amazon API key, sync config)
* Worker runs in parallel with concurrency limit
* Jobs auto-retry and log last synced timestamp per user
* Monitoring via **Bull Board** (Web UI for BullMQ jobs)
* Optional rate limit guards per user/API key

## Tooling and DX

* **Package Manager**: Always use `bun`, NEVER use `npm` or `node`
* **Docker Performance**: `COMPOSE_BAKE=true` enabled by default
* ESLint 9, Prettier, strict TSConfig
* Vitest + Testing Library + msw
* Sentry self hosted or Prometheus + Grafana
* pgAdmin4 GUI, MailDev for email testing, RedisInsight and Bull Board for queue/job inspection

### Monitoring Tools

* **Bull Board** - Access at `http://localhost:3001` to monitor:
  - All scheduled jobs and their status
  - Last execution time and results
  - Next execution time for repeating jobs
  - Failed jobs and retry attempts
  - Job queue metrics and performance

### Automatic API documentation

* API request and response schemas must be defined with **Zod**
* The script `scripts/generate-docs.ts` uses `zod-to-openapi` to create `docs/openapi.json`
* `openapi.json` is committed to the repository so Claude and other AIs can always read the current contract

### Development Automation

* Git workflow automated via `scripts/git.ts` with AI-powered commit messages
* Pre-commit hooks ensure code quality, schema validation, and migration tracking
* Database backups are automatically versioned with schema state
* API documentation is auto-generated from Zod schemas
* See `workflow.md` for detailed automation procedures

## Critical Development Rules

### ALWAYS FOLLOW THESE RULES:

0. **ENGLISH ONLY** - All code comments, documentation, commit messages, and any text in the codebase MUST be in English. This ensures global collaboration and maintainability.

1. **USE PATH ALIASES** - Always use the configured path aliases instead of relative imports:
   - **DDD Structure (Preferred for new code):**
     - `@domain/*` for domain entities and business logic
     - `@application/*` for use cases and DTOs
     - `@infrastructure/*` for technical implementations
     - `@presentation/*` for UI components in app/
   - **Current Module Structure (Maintain compatibility):**
     - `@auth/*` for auth module imports
     - `@users/*` for users module imports
     - `@posts/*` for posts module imports
   - **Shared:**
     - `@shared/*` for shared components
     - `@ui/*` for UI primitives
     - `@/*` for general imports

2. **NO MOCK DATA** - Never use mock or fake data unless explicitly asked. Always implement with real data sources.

3. **NO SIMULATED FEATURES** - Never simulate or fake functionality. Implement real, working features.

4. **REAL IMPLEMENTATIONS ONLY** - Every feature must work with real data and real integrations.

5. **CODE DOCUMENTATION** - For complex files and functions, add clear comments IN ENGLISH explaining:
   - What the code does
   - How it works
   - Why design decisions were made
   - Any important context for future developers

6. **NO HARDCODED VALUES** - NEVER hardcode any configuration values, especially:
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

7. **SECURITY FIRST** - Always validate inputs, sanitize data, and follow security best practices.

8. **TYPE SAFETY** - Maintain strict TypeScript types. Use Zod schemas for runtime validation.

9. **AUTOMATIC DATABASE MIGRATIONS** - When implementing new features that require database changes:
   - Modify the Drizzle schema files directly
   - Run the migration generation and application automatically
   - DO NOT create manual migration scripts for users to execute

10. **ALWAYS USE BUN** - For all operations:
    - Use `bun` for package management, NOT `npm` or `yarn`
    - Use `bun run` for scripts, NOT `npm run` or `node`
    - Use `bun install` for dependencies, NOT `npm install`
    - All scripts should have `#!/usr/bin/env bun` shebang

## Folder Convention - Domain Driven Design (DDD)

The structure below follows Domain Driven Design principles, organizing code in well-defined layers. This is the recommended structure:

```
project-root/
├── src/
│   ├── domain/                          # Domain Layer (Entities, Value Objects, Business Rules)
│   │   ├── auth/
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts       # User Entity
│   │   │   │   └── session.entity.ts    # Session Entity
│   │   │   ├── value-objects/
│   │   │   │   ├── email.vo.ts          # Email Value Object
│   │   │   │   └── password.vo.ts       # Password Value Object
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.ts   # Repository interface
│   │   │   ├── services/
│   │   │   │   └── auth.domain-service.ts # Domain services
│   │   │   └── events/
│   │   │       └── user-created.event.ts # Domain events
│   │   │
│   │   ├── users/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   ├── repositories/
│   │   │   └── services/
│   │   │
│   │   └── posts/
│   │       ├── entities/
│   │       ├── value-objects/
│   │       ├── repositories/
│   │       └── services/
│   │
│   ├── application/                     # Application Layer (Use Cases, DTOs)
│   │   ├── auth/
│   │   │   ├── use-cases/
│   │   │   │   ├── login.use-case.ts
│   │   │   │   ├── register.use-case.ts
│   │   │   │   └── logout.use-case.ts
│   │   │   ├── dtos/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   └── mappers/
│   │   │       └── user.mapper.ts
│   │   │
│   │   ├── users/
│   │   │   ├── use-cases/
│   │   │   ├── dtos/
│   │   │   └── mappers/
│   │   │
│   │   └── posts/
│   │       ├── use-cases/
│   │       ├── dtos/
│   │       └── mappers/
│   │
│   └── infrastructure/                  # Infrastructure Layer (Concrete implementations)
│       ├── database/
│       │   ├── drizzle/
│       │   │   ├── schema/
│       │   │   └── migrations/
│       │   └── repositories/
│       │       ├── user.repository.impl.ts
│       │       └── post.repository.impl.ts
│       ├── http/
│       │   └── trpc/
│       │       ├── routers/
│       │       │   ├── auth.router.ts
│       │       │   ├── users.router.ts
│       │       │   └── posts.router.ts
│       │       └── context.ts
│       ├── cache/
│       │   └── redis/
│       └── queues/
│           └── bullmq/
│
├── app/                                 # Presentation Layer (Next.js App Router)
│   ├── (marketing)/
│   ├── (modules)/                       # Modules organized by domain
│   │   ├── auth/
│   │   ├── users/
│   │   └── posts/
│   └── api/
│       └── trpc/
│
└── components/                          # Shared UI components
    ├── ui/
    └── layout/
```

## Key Concepts and Best Practices

### 1. Routing in Next.js 15

**Important**: Next.js 15 uses the App Router (`app/` directory), NOT the Pages Router (`/pages` directory).
- New pages go in `src/app/` following the folder-based routing
- Each folder represents a route segment
- `page.tsx` files define the UI for that route
- Use route groups `(groupname)` for organization without affecting URLs

### 2. Server vs Client Components

**Server Components (default):**
- Located anywhere, no special marking needed
- Can fetch data directly
- Cannot use browser APIs, event handlers, or state
- Better performance, smaller bundle size

**Client Components:**
- Must have `"use client"` directive at the top
- Can use hooks, event handlers, browser APIs
- Located in the same directories but marked explicitly

```typescript
// Server Component (default)
// src/app/(modules)/posts/_module/components/PostList.tsx
import { db } from '@/server/db';
import { PostCard } from './PostCard';

export async function PostList() {
  const posts = await db.query.posts.findMany();
  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

```typescript
// Client Component
// src/app/(modules)/posts/_module/components/PostEditor.client.tsx
"use client";

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

export function PostEditor() {
  const [title, setTitle] = useState('');
  const createPost = trpc.posts.create.useMutation();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      createPost.mutate({ title });
    }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

### 3. Domain Driven Design Architecture

#### Architecture Layers

**1. Domain Layer**
- Contains pure business logic
- Entities, Value Objects, Domain Services
- Repository interfaces
- Domain events
- Does not depend on any other layer

**2. Application Layer**
- Use Cases
- DTOs (Data Transfer Objects)
- Mappers between domain and DTOs
- Orchestrates domain operations

**3. Infrastructure Layer**
- Concrete repository implementations
- Database integrations
- Framework configurations
- External adapters

**4. Presentation Layer**
- React/Next.js components
- Pages and Layouts
- Custom hooks
- UI state

#### Path Aliases for DDD

```typescript
// Import examples with DDD
import { User } from '@domain/auth/entities/user.entity';
import { LoginUseCase } from '@application/auth/use-cases/login.use-case';
import { UserRepository } from '@infrastructure/database/repositories/user.repository.impl';
import { Button } from '@ui/button';

// Maintains compatibility with current structure
import { AuthProvider } from '@auth/components/AuthProvider.client';
```

#### Gradual Migration

1. **New features**: Implement using DDD structure
2. **Existing features**: Keep working, migrate gradually
3. **Sharing**: Use aliases for both structures

### 4. tRPC Integration

**tRPC Setup:**
```typescript
// src/server/api/trpc.ts
import { initTRPC } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { db } from '@/server/db';

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  return {
    db,
    headers: opts.headers,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
```

**Root Router:**
```typescript
// src/server/api/root.ts
import { createTRPCRouter } from './trpc';
import { usersRouter } from '@users/server/users.router';
import { postsRouter } from '@posts/server/posts.router';
import { authRouter } from '@auth/server/auth.router';

export const appRouter = createTRPCRouter({
  users: usersRouter,
  posts: postsRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
```

### 5. Drizzle ORM Organization

**Schema Example:**
```typescript
// src/server/db/schema/users.schema.ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### 6. Testing Organization

Tests are organized by type:
- **unit/**: Unit tests for individual functions/components
- **integration/**: Integration tests for API routes and features
- **e2e/**: End-to-end tests for user flows

### 7. Environment Configuration

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

### 8. Route Creation Guidelines

When creating new routes in Next.js 15:

1. **Basic Route**: Create folder with `page.tsx`
   ```
   src/app/products/page.tsx → /products
   ```

2. **Dynamic Route**: Use square brackets
   ```
   src/app/products/[id]/page.tsx → /products/123
   ```

3. **Route Groups**: Use parentheses for organization (doesn't affect URL)
   ```
   src/app/(shop)/products/page.tsx → /products
   src/app/(admin)/products/page.tsx → /products
   ```

4. **Module Routes**: For feature modules
   ```
   src/app/(modules)/auth/profile/page.tsx → /auth/profile
   src/app/(modules)/users/page.tsx → /users
   src/app/(modules)/posts/[id]/page.tsx → /posts/123
   ```

4. **API Routes**: Always through tRPC
   ```
   src/app/api/trpc/[trpc]/route.ts → Handles all tRPC endpoints
   ```

5. **Required Files per Route**:
   - `page.tsx` - The UI (required)
   - `loading.tsx` - Loading state (optional)
   - `error.tsx` - Error boundary (optional)
   - `layout.tsx` - Shared layout (optional)
   - `not-found.tsx` - 404 handling (optional)

6. **Route Naming Conventions**:
   - Use kebab-case for folders: `user-profile` not `userProfile`
   - Keep URLs short and semantic
   - Group related routes: `(dashboard)/settings/account`

### 9. Middleware

Place middleware at `src/middleware.ts` for authentication, redirects, etc.:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Auth logic here
  return NextResponse.next();
}

export const config = {
  matcher: '/(auth)/:path*',
};
```

## Benefits of DDD Structure

1. **Separation of Concerns**: Well-defined layers with clear responsibilities
2. **Testability**: Isolated business logic facilitates unit testing
3. **Maintainability**: Changes in one layer don't affect others
4. **Scalability**: Easy to add new domains and features
5. **Flexibility**: Can swap implementations without affecting domain
6. **Type Safety**: Strong types across all layers
7. **Clean Architecture**: Follows SOLID principles and Clean Code

## DDD Implementation Example

### 1. Entity (Domain)
```typescript
// src/domain/users/entities/user.entity.ts
export class User {
  constructor(
    private readonly id: string,
    private email: Email,
    private name: string,
    private readonly createdAt: Date
  ) {}

  changeEmail(newEmail: Email): void {
    // Business rule here
    this.email = newEmail;
  }

  // Getters for controlled access
  getId(): string { return this.id; }
  getEmail(): string { return this.email.getValue(); }
}
```

### 2. Use Case (Application)
```typescript
// src/application/users/use-cases/create-user.use-case.ts
import { User } from '@domain/users/entities/user.entity';
import { UserRepository } from '@domain/users/repositories/user.repository';

export class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(dto: CreateUserDto): Promise<UserDto> {
    // Validations and application rules
    const user = User.create(dto);

    // Persist through repository
    await this.userRepository.save(user);

    // Return DTO
    return UserMapper.toDto(user);
  }
}
```

### 3. Repository Implementation (Infrastructure)
```typescript
// src/infrastructure/database/repositories/user.repository.impl.ts
import { db } from '@/lib/drizzle';
import { users } from '@infrastructure/database/drizzle/schema';

export class DrizzleUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    await db.insert(users).values({
      id: user.getId(),
      email: user.getEmail(),
      // ... map entity to database schema
    });
  }

  async findById(id: string): Promise<User | null> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    return result ? UserMapper.toDomain(result) : null;
  }
}
```

### 4. tRPC Router (HTTP Infrastructure)
```typescript
// src/infrastructure/http/trpc/routers/users.router.ts
import { CreateUserUseCase } from '@application/users/use-cases/create-user.use-case';
import { userRepository } from '@infrastructure/database/repositories';

export const usersRouter = createTRPCRouter({
  create: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      const useCase = new CreateUserUseCase(userRepository);
      return await useCase.execute(input);
    })
});
```

This structure follows Next.js 15 best practices while implementing Domain Driven Design principles for building scalable, maintainable applications.

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

### Multiple Deployments on Same Server

To run multiple instances on the same server, use different `.env` files:

```bash
# Project 1: .env.project1
PROJECT_NAME=project1
DB_PORT=5432
REDIS_PORT=6379
API_PORT=8000

# Project 2: .env.project2
PROJECT_NAME=project2
DB_PORT=5433
REDIS_PORT=6380
API_PORT=8001

# Run with specific env file
docker-compose --env-file .env.project1 up -d
docker-compose --env-file .env.project2 up -d
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
* See `workflow.md` for detailed deployment procedures

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

## Benefits Recap

* Type safety from DB to UI
* Scalable background jobs via BullMQ
* Per-user sync via repeatable queue jobs
* Full observability via Bull Board
* Runs entirely in Docker Compose, no cloud vendor lock-in
