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

0. **USE PATH ALIASES** - Always use the configured path aliases instead of relative imports:
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

1. **NO MOCK DATA** - Never use mock or fake data unless explicitly asked. Always implement with real data sources.

2. **NO SIMULATED FEATURES** - Never simulate or fake functionality. Implement real, working features.

3. **REAL IMPLEMENTATIONS ONLY** - Every feature must work with real data and real integrations.

4. **CODE DOCUMENTATION** - For complex files and functions, add clear comments explaining:
   - What the code does
   - How it works
   - Why design decisions were made
   - Any important context for future developers

5. **NO HARDCODED CREDENTIALS** - NEVER hardcode any credentials, API keys, or secrets in the code. Always use environment variables without fallback values.
   - ❌ WRONG: `database: process.env.POSTGRES_DB || 'myapp'`
   - ✅ CORRECT: `database: process.env.POSTGRES_DB`

6. **SECURITY FIRST** - Always validate inputs, sanitize data, and follow security best practices.

7. **TYPE SAFETY** - Maintain strict TypeScript types. Use Zod schemas for runtime validation.

8. **AUTOMATIC DATABASE MIGRATIONS** - When implementing new features that require database changes:
   - Modify the Drizzle schema files directly
   - Run the migration generation and application automatically
   - DO NOT create manual migration scripts for users to execute

9. **ALWAYS USE BUN** - For all operations:
   - Use `bun` for package management, NOT `npm` or `yarn`
   - Use `bun run` for scripts, NOT `npm run` or `node`
   - Use `bun install` for dependencies, NOT `npm install`
   - All scripts should have `#!/usr/bin/env bun` shebang

## Folder Convention - Domain Driven Design (DDD)

### Nova Estrutura Recomendada (DDD)

A estrutura abaixo segue os princípios do Domain Driven Design, organizando o código em camadas bem definidas. Esta é a estrutura recomendada para novos recursos:

```
project-root/
├── src/
│   ├── domain/                          # Camada de Domínio (Entidades, Value Objects, Regras de Negócio)
│   │   ├── auth/
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts       # Entidade User
│   │   │   │   └── session.entity.ts    # Entidade Session
│   │   │   ├── value-objects/
│   │   │   │   ├── email.vo.ts          # Value Object Email
│   │   │   │   └── password.vo.ts       # Value Object Password
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.ts   # Interface do repositório
│   │   │   ├── services/
│   │   │   │   └── auth.domain-service.ts # Serviços de domínio
│   │   │   └── events/
│   │   │       └── user-created.event.ts # Eventos de domínio
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
│   ├── application/                     # Camada de Aplicação (Use Cases, DTOs)
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
│   └── infrastructure/                  # Camada de Infraestrutura (Implementações concretas)
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
├── app/                                 # Camada de Apresentação (Next.js App Router)
│   ├── (marketing)/
│   ├── (modules)/                       # Módulos organizados por domínio
│   │   ├── auth/
│   │   ├── users/
│   │   └── posts/
│   └── api/
│       └── trpc/
│
└── components/                          # Componentes de UI compartilhados
    ├── ui/
    └── layout/
```

### Estrutura Atual (Manter Compatibilidade)

```
project-root/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (marketing)/                  # Public routes group
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                  # Home page
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   └── pricing/
│   │   │       └── page.tsx
│   │   ├── (modules)/                    # Feature modules routes
│   │   │   ├── auth/
│   │   │   │   ├── _module/              # Auth module internals
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── AuthProvider.client.tsx
│   │   │   │   │   │   ├── SignupForm.client.tsx
│   │   │   │   │   │   └── LoginForm.client.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── use-auth.ts
│   │   │   │   │   ├── server/
│   │   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   │   └── auth.router.ts
│   │   │   │   │   └── types/
│   │   │   │   │       └── auth.types.ts
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── error.tsx
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   ├── users/
│   │   │   │   ├── _module/              # Users module internals
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── UserList.tsx
│   │   │   │   │   │   ├── UserCard.tsx
│   │   │   │   │   │   └── UserActions.client.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── use-users.ts
│   │   │   │   │   ├── server/
│   │   │   │   │   │   ├── users.service.ts
│   │   │   │   │   │   └── users.router.ts
│   │   │   │   │   └── types/
│   │   │   │   │       └── user.types.ts
│   │   │   │   └── page.tsx             # Users list page
│   │   │   └── posts/
│   │   │       ├── _module/              # Posts module internals
│   │   │       │   ├── components/
│   │   │       │   │   ├── PostList.tsx
│   │   │       │   │   ├── PostDetail.tsx
│   │   │       │   │   ├── PostEditor.client.tsx
│   │   │       │   │   └── CommentSection.client.tsx
│   │   │       │   ├── hooks/
│   │   │       │   │   └── use-posts.ts
│   │   │       │   ├── server/
│   │   │       │   │   ├── posts.service.ts
│   │   │       │   │   └── posts.router.ts
│   │   │       │   └── types/
│   │   │       │       └── post.types.ts
│   │   │       └── page.tsx             # Posts list page
│   │   ├── api/
│   │   │   └── trpc/
│   │   │       └── [trpc]/
│   │   │           └── route.ts          # tRPC HTTP handler
│   │   ├── layout.tsx                    # Root layout
│   │   ├── error.tsx                     # Global error boundary
│   │   ├── loading.tsx                   # Global loading state
│   │   ├── not-found.tsx                 # 404 page
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   └── opengraph-image.tsx
│   │
│   ├── components/                       # Shared/global components
│   │   ├── ui/                          # Primitive UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown.tsx
│   │   │   ├── input.tsx
│   │   │   └── toast.tsx
│   │   ├── layout/                      # Layout components
│   │   │   ├── header.tsx               # Server component
│   │   │   ├── footer.tsx               # Server component
│   │   │   ├── nav-menu.tsx             # Client component
│   │   │   └── sidebar.tsx              # Client component
│   │   └── common/                      # Common components
│   │       ├── loading-spinner.tsx
│   │       ├── error-boundary.tsx
│   │       └── seo-meta.tsx
│   │
│   ├── server/                          # Server-side code
│   │   ├── api/
│   │   │   ├── root.ts                  # Root tRPC router
│   │   │   └── trpc.ts                  # tRPC instance & context
│   │   ├── db/
│   │   │   ├── index.ts                 # Database connection
│   │   │   ├── schema/                  # Drizzle schemas
│   │   │   │   ├── auth.schema.ts
│   │   │   │   ├── users.schema.ts
│   │   │   │   ├── posts.schema.ts
│   │   │   │   └── index.ts             # Export all schemas
│   │   │   └── migrations/              # Generated by Drizzle
│   │   └── services/                    # Shared services
│   │       ├── email.service.ts
│   │       └── storage.service.ts
│   │
│   ├── lib/                             # Third-party library configs
│   │   ├── trpc/
│   │   │   ├── client.ts                # tRPC client
│   │   │   └── server.ts                # Server-side tRPC helpers
│   │   ├── drizzle.ts                   # Drizzle client export
│   │   └── utils.ts                     # Utility functions
│   │
│   ├── hooks/                           # Global React hooks
│   │   ├── use-media-query.ts
│   │   ├── use-local-storage.ts
│   │   └── use-debounce.ts
│   │
│   ├── types/                           # Global TypeScript types
│   │   ├── global.d.ts
│   │   ├── env.d.ts
│   │   └── api.types.ts
│   │
│   ├── styles/                          # Global styles
│   │   ├── globals.css
│   │   └── variables.css
│   │
│   ├── utils/                           # Utility functions
│   │   ├── cn.ts                        # Class name helper
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   │
│   └── middleware.ts                    # Next.js middleware
│
├── public/                              # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── scripts/                      # Build/deployment scripts
│   ├── git.ts
│   ├── dev.sh
│   └── prod.sh
│
├── drizzle/                             # Drizzle generated files
│   └── migrations/
│
├── .env.example
├── .env.local
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── drizzle.config.ts
├── next-env.d.ts
├── next.config.js
├── package.json
├── README.md
├── tailwind.config.ts
└── tsconfig.json
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

#### Camadas da Arquitetura

**1. Domain Layer (Domínio)**
- Contém a lógica de negócio pura
- Entidades, Value Objects, Domain Services
- Interfaces de repositórios
- Eventos de domínio
- Não depende de nenhuma outra camada

**2. Application Layer (Aplicação)**
- Use Cases (casos de uso)
- DTOs (Data Transfer Objects)
- Mappers entre domínio e DTOs
- Orquestra operações de domínio

**3. Infrastructure Layer (Infraestrutura)**
- Implementações concretas dos repositórios
- Integrações com bancos de dados
- Configurações de frameworks
- Adaptadores externos

**4. Presentation Layer (Apresentação)**
- Componentes React/Next.js
- Pages e Layouts
- Hooks customizados
- Estado da UI

#### Path Aliases para DDD

```typescript
// Exemplos de imports com DDD
import { User } from '@domain/auth/entities/user.entity';
import { LoginUseCase } from '@application/auth/use-cases/login.use-case';
import { UserRepository } from '@infrastructure/database/repositories/user.repository.impl';
import { Button } from '@ui/button';

// Mantém compatibilidade com estrutura atual
import { AuthProvider } from '@auth/components/AuthProvider.client';
```

#### Migração Gradual

1. **Novos recursos**: Implementar usando estrutura DDD
2. **Recursos existentes**: Manter funcionando, migrar gradualmente
3. **Compartilhamento**: Use aliases para ambas estruturas

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

1. **Separation of Concerns**: Camadas bem definidas com responsabilidades claras
2. **Testabilidade**: Lógica de negócio isolada facilita testes unitários
3. **Manutenibilidade**: Mudanças em uma camada não afetam outras
4. **Escalabilidade**: Fácil adicionar novos domínios e funcionalidades
5. **Flexibilidade**: Pode trocar implementações sem afetar domínio
6. **Type Safety**: Tipos fortes em todas as camadas
7. **Clean Architecture**: Segue princípios SOLID e Clean Code

## Exemplo de Implementação DDD

### 1. Entity (Domínio)
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
    // Regra de negócio aqui
    this.email = newEmail;
  }

  // Getters para acesso controlado
  getId(): string { return this.id; }
  getEmail(): string { return this.email.getValue(); }
}
```

### 2. Use Case (Aplicação)
```typescript
// src/application/users/use-cases/create-user.use-case.ts
import { User } from '@domain/users/entities/user.entity';
import { UserRepository } from '@domain/users/repositories/user.repository';

export class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(dto: CreateUserDto): Promise<UserDto> {
    // Validações e regras de aplicação
    const user = User.create(dto);
    
    // Persiste através do repositório
    await this.userRepository.save(user);
    
    // Retorna DTO
    return UserMapper.toDto(user);
  }
}
```

### 3. Repository Implementation (Infraestrutura)
```typescript
// src/infrastructure/database/repositories/user.repository.impl.ts
import { db } from '@/lib/drizzle';
import { users } from '@infrastructure/database/drizzle/schema';

export class DrizzleUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    await db.insert(users).values({
      id: user.getId(),
      email: user.getEmail(),
      // ... mapear entidade para schema do banco
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

### 4. tRPC Router (Infraestrutura HTTP)
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

## Benefits Recap

* Type safety from DB to UI
* Scalable background jobs via BullMQ
* Per-user sync via repeatable queue jobs
* Full observability via Bull Board
* Runs entirely in Docker Compose, no cloud vendor lock-in
