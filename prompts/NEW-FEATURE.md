# NEW FEATURE Implementation Request

## Task Requirements

1. Create the backend files and folder as stated in the documentation
2. Create basic routes to make it work as example

**Follow ALL guidelines from the documentation below strictly.**

---

# Project Overview

## Name
Conkero

## Vision
A SaaS platform that helps Amazon sellers increase sales and reduce manual work by automating critical business operations.

## Description
Conkero is an automation platform designed for Amazon sellers who want to:
- Save time on repetitive tasks
- Monitor inventory and pricing automatically
- Scale their operations efficiently
- Focus on growth instead of manual work

---

# Core Tech Stack

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

---

# Project Structure

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
├─ infra/                      ← Infrastructure configuration
├─ prompts/                    ← prompt snippets for Claude
├─ scripts/
│  ├─ dev.sh                   ← To run project in development
│  └─ prod.sh                  ← To run project in production
├─ tests/                      ← bun test specs
├─ worker/                     ← Background job processing
├─ .env.example
├─ .env.local
├─ .gitignore
└─ README.md
```

---

# Critical Development Rules

## ALWAYS FOLLOW THESE RULES:

1. **ENGLISH ONLY** - All code comments, documentation, commit messages, and any text in the codebase MUST be in English.

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

9. **ALWAYS USE BUN INSIDE DOCKER** - For all operations.

10. **NO CONSOLE LOGGING** - NEVER use console.log, console.error, console.warn, or console.debug:
    - ❌ WRONG: `console.log('User logged in')`
    - ❌ WRONG: `console.error('Database error:', error)`
    - ✅ CORRECT: `logger.info('User logged in', { userId })`
    - ✅ CORRECT: `logger.error('Database error', error)`
    
    Always use the project's logger:
    - Import logger in every file that needs logging
    - Use appropriate log levels (error, warn, info, debug)
    - Include relevant context in log messages
    - Logs are automatically saved to `./logger` folder and shown in terminal

---

# Key Concepts and Best Practices

## Environment Configuration

**IMPORTANT**: Always use `.env.local` for local development, NEVER use `.env`
- `.env.local` is gitignored by default
- `.env` might accidentally be committed
- Use `.env.example` for documenting required variables

## Environment Management

* All configuration via environment variables (`.env.local` for dev, `.env.production` for prod)
* Always use SSL in production - no HTTP-only option
* Nginx templates processed at runtime with environment variables

## Development Standards

- Everything runs in Docker containers - no local runtime dependencies
- Strict TypeScript with no implicit any
- All inputs validated with Zod schemas
- Comprehensive error handling and logging
- Security-first approach in all implementations

## Documentation Requirements

- Maintain `.env.example` with all required variables
- Document API endpoints with OpenAPI/Swagger
- Keep README.md updated with setup instructions
- Add inline comments for complex logic
- Document architectural decisions in `/docs`

---

# Backend Guidelines

## Database Architecture

### Core Principles

| Principle | Description |
| --------- | ----------- |
| **Data Persistence** | ALL credentials and data stored in PostgreSQL - no local files or in-memory storage |
| **Volume Continuity** | Database persists between Docker restarts via data volumes |
| **Version Control** | Migrations are version-controlled and immutable after creation |
| **Schema Tracking** | Changes tracked via SHA-256 hashing, correlated with git commits |
| **Transaction Safety** | All migrations run in transactions with automatic rollback on failure |

## Database Migration Strategy

**We use Drizzle Kit for safe, version-controlled database migrations**

| Feature | Description |
| ------- | ----------- |
| **Automated Backups** | Every migration creates a backup before execution |
| **Version Tracking** | SHA-256 schema hashing + git commit correlation |
| **Rollback Support** | Manual rollback scripts for complex changes |
| **Staging Testing** | Test migrations on staging before production |
| **Transaction Safety** | All migrations run in transactions |
| **Zero Downtime** | Support for backwards-compatible migrations |

### Migration Workflow

#### Development Workflow

```bash
# Generate migration from schema changes
bun drizzle-kit generate:pg

# Review generated SQL
cat migrations/drizzle/0001_*.sql

# Apply migration to dev database
bun run scripts/migrate.ts

# Create rollback script if needed
cp migrations/drizzle/0001_*.sql migrations/rollback/
# Edit rollback script to reverse changes
```

#### Production Deployment

```bash
# Automatic process in prod.sh:
1. Check for pending migrations
2. Create full database backup
3. Test on staging (if available)
4. Apply migrations with confirmation
5. Verify application health
6. Update schema dump
```

### Migration File Structure

```text
migrations/
├── drizzle/                    # Auto-generated by Drizzle Kit
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_user_roles.sql
│   └── meta/                   # Drizzle metadata
├── rollback/                   # Manual rollback scripts
│   └── 0002_remove_user_roles.sql
└── seeds/                      # Data seeding scripts
    └── 001_initial_data.ts
```

### Migration Best Practices

1. **Always Backwards Compatible**
   ```sql
   -- GOOD: Add nullable column first
   ALTER TABLE users ADD COLUMN phone VARCHAR(20);
   -- Deploy code that handles null values
   -- Then make non-nullable in next migration

   -- BAD: Breaking change
   ALTER TABLE users ADD COLUMN phone VARCHAR(20) NOT NULL;
   ```

2. **Split Complex Migrations**
   ```sql
   -- Migration 1: Add new column
   ALTER TABLE orders ADD COLUMN status_v2 VARCHAR(50);

   -- Migration 2: Copy data
   UPDATE orders SET status_v2 = 
     CASE status 
       WHEN 1 THEN 'pending'
       WHEN 2 THEN 'completed'
       ELSE 'unknown'
     END;

   -- Migration 3: Switch to new column
   ALTER TABLE orders DROP COLUMN status;
   ALTER TABLE orders RENAME COLUMN status_v2 TO status;
   ```

3. **Index Creation Strategy**
   ```sql
   -- Use CONCURRENTLY to avoid locking
   CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

   -- Note: Cannot use CONCURRENTLY inside transaction
   -- Drizzle handles this automatically
   ```

## Cache & Job Queue

### Cache Architecture (Redis)

| Component | Purpose |
| --------- | ------- |
| **Sessions** | Ephemeral user session storage |
| **Rate Limiting** | API rate limit counters |
| **Pub/Sub** | Real-time event broadcasting |
| **Hot Data** | Frequently accessed data cache |

### Job Queue Architecture (PostgreSQL-based)

**Recommended: pg-boss or graphile-worker** - Uses PostgreSQL for job queuing instead of Redis

| Benefit | Description |
| ------- | ----------- |
| **Single Database** | No additional infrastructure needed |
| **ACID Guarantees** | Reliable job processing with transactions |
| **Built-in History** | Automatic job archival and audit trail |
| **SQL Monitoring** | Query job status with familiar SQL |
| **Cost Effective** | No separate Redis cluster for jobs |

## Worker & Job Management

### Architecture Overview

The project uses a **separate worker service** for background jobs:

| Service | Purpose | Entry Point |
| ------- | ------- | ----------- |
| **API** | Handles HTTP requests, creates jobs | `/backend/server.ts` |
| **Worker** | Processes background jobs | `/worker/index.ts` |

Both services share the same codebase but run as separate Docker containers.

### Job Implementation with pg-boss

**PostgreSQL-based job queue with pg-boss for reliability and simplicity**

```typescript
// backend/lib/jobs.ts - Initialize pg-boss
import PgBoss from 'pg-boss';

export const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  schema: 'pgboss',
  
  // Archive completed jobs for 30 days
  archiveCompletedAfterSeconds: 60 * 60 * 24 * 30,
  
  // Monitor configuration
  monitorStateIntervalSeconds: 10,
});

// Start the job queue
await boss.start();

// Define job handlers with progress tracking
export const jobHandlers = {
  'sync-user-data': async (job: PgBoss.Job<{ userId: string; tenantId: string }>) => {
    const { userId } = job.data;
    
    // Update user-visible job status
    await updateJobProgress(job.id, userId, 0, 'Starting sync...');
    
    // Perform the actual work
    const result = await syncUserData(userId, (progress) => {
      updateJobProgress(job.id, userId, progress, `Syncing... ${progress}%`);
    });
    
    await updateJobProgress(job.id, userId, 100, 'Sync completed');
    return result;
  },
  
  'send-email': async (job: PgBoss.Job<EmailData>) => {
    const { to, subject, body } = job.data;
    return await emailService.send({ to, subject, body });
  },
  
  'generate-report': async (job: PgBoss.Job<ReportData>) => {
    const { userId, reportType } = job.data;
    return await reportService.generate(userId, reportType);
  }
} as const;

export type JobName = keyof typeof jobHandlers;

// Register all job handlers
for (const [jobName, handler] of Object.entries(jobHandlers)) {
  await boss.work(jobName, { teamSize: 5, teamConcurrency: 2 }, handler);
}
```

### Database Schema for Job Management

```sql
-- User-visible job status (separate from pg-boss internal tables)
CREATE TABLE user_job_status (
  id UUID PRIMARY KEY, -- matches pg-boss job id
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast queries
  INDEX idx_user_status (user_id, status, created_at DESC),
  INDEX idx_tenant_jobs (tenant_id, created_at DESC)
);

-- User-specific job schedules
CREATE TABLE user_job_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  job_name VARCHAR(50) NOT NULL, -- must match jobHandlers keys
  cron_expression VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}', -- job-specific data
  timezone VARCHAR(50) DEFAULT 'UTC',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, job_name)
);
```

### Worker Implementation

```typescript
// worker/index.ts - Worker entry point
import { boss, jobHandlers } from '@/backend/lib/jobs';
import { db } from '@/backend/lib/db';

// Start pg-boss and begin processing jobs
await boss.start();

// Load and schedule user cron jobs from database
async function loadUserSchedules() {
  const schedules = await db.query.userJobSchedules.findMany({
    where: eq(userJobSchedules.isActive, true)
  });

  for (const schedule of schedules) {
    if (schedule.cronExpression) {
      // Create unique schedule name per user
      const scheduleName = `${schedule.jobName}-user-${schedule.userId}`;
      
      await boss.schedule(
        scheduleName,
        schedule.cronExpression,
        schedule.jobName, // actual job to run
        { 
          userId: schedule.userId,
          ...schedule.config 
        },
        { 
          tz: schedule.timezone,
          singletonKey: scheduleName // Prevent duplicate schedules
        }
      );
    }
  }
}

// Initialize schedules on startup
await loadUserSchedules();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Worker shutting down...');
  await boss.stop();
  process.exit(0);
});

// Helper function to update job progress (used in handlers)
export async function updateJobProgress(
  jobId: string,
  userId: string,
  progress: number,
  message: string
) {
  await db.upsert(userJobStatus)
    .values({
      id: jobId,
      userId,
      progress,
      message,
      status: progress === 100 ? 'completed' : 'running',
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: userJobStatus.id,
      set: { progress, message, updatedAt: new Date() }
    });
}
```

### Why This Approach?

**Jobs in Files + Scheduling in Database = Best of Both Worlds**

| Aspect | Benefit |
| ------ | ------- |
| **Type Safety** | Job definitions are typed and validated at compile time |
| **Version Control** | All job logic is tracked in git |
| **Testing** | Easy to unit test job handlers |
| **Security** | No arbitrary code execution from database |
| **Flexibility** | Schedules can be changed without deployment |
| **Multi-tenant** | Each user gets their own schedule |

### Job Management Features

| Feature | Description |
| ------- | ----------- |
| **Central Definition** | All jobs in one file for easy discovery |
| **Per-User Scheduling** | Each user can have different cron schedules |
| **Runtime Control** | Enable/disable schedules without code changes |
| **Audit Trail** | Track job execution history in database |
| **Type Safety** | Full TypeScript support for job data |

## Backend Structure

```text
backend/
├── server.ts              # Bun.serve entry point
├── routes/
│   ├── _manifest.ts      # Auto-generated route registry
│   ├── index.ts          # Main route definitions
│   └── [feature]/        # Feature-specific routes
├── controllers/          # Request handlers
│   └── [feature].controller.ts
├── services/            # Business logic layer
│   └── [feature].service.ts
├── models/              # Database schemas (Drizzle)
│   └── [feature].model.ts
├── middlewares/         # Auth, validation, etc.
│   ├── auth.ts
│   └── validate.ts
├── lib/                 # Core utilities
│   ├── db.ts           # Drizzle client & helpers
│   ├── auth.ts         # Lucia session helpers
│   ├── cache.ts        # Redis client
│   ├── jobs.ts         # pg-boss setup & job handlers
│   └── openapi.ts      # API documentation generator
├── utils/              # Helper functions
│   └── crypto.ts
├── config/             # Configuration
│   └── env.ts
└── types/              # TypeScript definitions
    └── api.d.ts

worker/                  # Separate worker service
├── index.ts            # Worker entry point (loads schedules, starts pg-boss)
└── health.ts          # Health check endpoint for Docker
```

## Development Standards

### Logging Standards

**MANDATORY: Use the project logger for ALL logging needs**

```typescript
// ❌ NEVER use console methods
console.log('Server started');
console.error('Database error:', error);
console.warn('Slow query detected');
console.debug('Request payload:', data);

// ✅ ALWAYS use the logger
import { logger, createLogger } from '@/backend/lib/logger';

// Use default logger
logger.info('Server started', { port: 8000, env: process.env.NODE_ENV });
logger.error('Database connection failed', error);
logger.warn('Slow query detected', { query: sql, duration: 5000 });
logger.debug('Request received', { method: req.method, path: req.url });

// Create scoped logger for modules
const dbLogger = createLogger({ source: 'database' });
dbLogger.info('Migration completed', { version: '0001' });

// Create child logger with context
const requestLogger = logger.child({ requestId: crypto.randomUUID() });
requestLogger.info('Processing request', { userId });
```

**Logger Configuration:**
- Set `LOG_TO_FILE=true` in `.env` to enable file logging
- Logs are saved to `./logger/app-YYYY-MM-DD.log`
- All logs appear in terminal with colors and formatting
- Use appropriate log levels: error, warn, info, debug
- Always include relevant context in log messages

### API Design Patterns

1. **Controller-Service-Repository Pattern**
   ```typescript
   // controllers/user.controller.ts - HTTP layer only
   export async function createUser(req: Request) {
     const data = await validateBody(req, createUserSchema);
     const user = await userService.create(data);
     return Response.json(user, { status: 201 });
   }

   // services/user.service.ts - Business logic
   export async function create(data: CreateUserDTO) {
     const hashedPassword = await hashPassword(data.password);
     return userRepository.create({ ...data, password: hashedPassword });
   }

   // repositories/user.repository.ts - Data access
   export async function create(data: User) {
     return db.insert(users).values(data).returning();
   }
   ```

2. **Request/Response DTOs with Zod**
   ```typescript
   // schemas/user.schema.ts
   export const createUserSchema = z.object({
     email: z.string().email(),
     password: z.string().min(8).max(100),
     name: z.string().min(2).max(50),
     role: z.enum(['user', 'admin']).default('user')
   });

   export type CreateUserDTO = z.infer<typeof createUserSchema>;
   ```

3. **Consistent Error Responses**
   ```typescript
   // utils/api-error.ts
   export class ApiError extends Error {
     constructor(
       public statusCode: number,
       public message: string,
       public errors?: any[]
     ) {
       super(message);
     }
   }

   // middleware/error-handler.ts
   export function errorHandler(error: Error) {
     if (error instanceof ApiError) {
       return Response.json({
         error: error.message,
         errors: error.errors
       }, { status: error.statusCode });
     }
     // Handle other errors...
   }
   ```

### Automatic API Documentation

**We use a hybrid approach: runtime generation with intelligent caching**

#### Setup OpenAPI Registry (`backend/lib/openapi.ts`)

```typescript
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

export const registry = new OpenAPIRegistry();

// Define reusable schemas
export const UserSchema = registry.register(
  'User',
  z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['user', 'admin']),
    createdAt: z.string().datetime()
  })
);

export const ErrorSchema = registry.register(
  'Error',
  z.object({
    error: z.string(),
    errors: z.array(z.any()).optional()
  })
);

// Cache for generated documentation
let cachedSpec: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute in development

export function generateOpenAPIDocument(baseUrl: string) {
  const now = Date.now();
  
  // Return cached spec if still valid
  if (cachedSpec && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSpec;
  }
  
  const generator = new OpenApiGeneratorV3(registry.definitions);
  
  cachedSpec = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: process.env.APP_VERSION || '1.0.0',
      title: 'API Documentation',
      description: 'Auto-generated API documentation'
    },
    servers: [{ url: baseUrl }]
  });
  
  cacheTimestamp = now;
  return cachedSpec;
}

// Clear cache on hot reload in development
if (process.env.NODE_ENV === 'development') {
  process.on('SIGUSR2', () => {
    cachedSpec = null;
  });
}
```

#### Document Routes (`backend/routes/users.ts`)

```typescript
import { registry } from '@/backend/lib/openapi';
import { z } from 'zod';
import { UserSchema, ErrorSchema } from '@/backend/lib/openapi';

// Define request/response schemas
const CreateUserBody = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8)
});

const CreateUserResponse = z.object({
  user: UserSchema,
  token: z.string()
});

// Register endpoint documentation
registry.registerPath({
  method: 'post',
  path: '/api/users',
  summary: 'Create a new user',
  tags: ['Users'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserBody
        }
      }
    }
  },
  responses: {
    201: {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: CreateUserResponse
        }
      }
    },
    400: {
      description: 'Invalid input',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    }
  }
});

// Actual route handler
export async function createUser(req: Request) {
  const data = await validateBody(req, CreateUserBody);
  const user = await userService.create(data);
  return Response.json({ user, token: generateToken(user) }, { status: 201 });
}
```

#### Serve Swagger UI (`backend/routes/docs.ts`)

```typescript
import { generateOpenAPIDocument } from '@/backend/lib/openapi';
import { getUser } from '@/backend/lib/auth';

export async function serveApiDocs(req: Request) {
  const url = new URL(req.url);
  
  // Optional: Require admin access
  const user = await getUser(req);
  if (!user || user.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Serve Swagger UI
  if (url.pathname === '/api-docs') {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>API Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
        <style>
          body { margin: 0; }
          .swagger-ui .topbar { display: none; }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.onload = () => {
            SwaggerUIBundle({
              url: '/api-docs/openapi.json',
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.SwaggerUIStandalonePreset
              ],
              layout: 'BaseLayout',
              tryItOutEnabled: true,
              persistAuthorization: true
            });
          };
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // Serve OpenAPI JSON
  if (url.pathname === '/api-docs/openapi.json') {
    const origin = `${url.protocol}//${url.host}`;
    const spec = generateOpenAPIDocument(origin);
    
    return Response.json(spec);
  }
  
  return new Response('Not Found', { status: 404 });
}
```

#### Route Registration (`backend/routes/index.ts`)

```typescript
import { serveApiDocs } from './docs';
import { createUser, getUsers, getUser, updateUser, deleteUser } from './users';

// Import all route files to register OpenAPI definitions
import './users';
import './auth';
import './posts';

export const routes = {
  // API Documentation (admin only)
  'GET /api-docs': serveApiDocs,
  'GET /api-docs/openapi.json': serveApiDocs,
  
  // User routes
  'POST /api/users': createUser,
  'GET /api/users': getUsers,
  'GET /api/users/:id': getUser,
  'PUT /api/users/:id': updateUser,
  'DELETE /api/users/:id': deleteUser,
  
  // ... other routes
};
```

#### Installation & Usage

```bash
# Install required packages
bun add @asteasolutions/zod-to-openapi

# Access documentation
# Development: http://localhost:8000/api-docs
# Production: https://yourapi.com/api-docs (admin only)
```

#### Features

- **Auto-generated** from your Zod schemas
- **Interactive testing** with "Try it out" button
- **Always up-to-date** - generated at runtime
- **Cached for performance** - regenerates every minute in dev
- **Protected access** - can require admin role
- **No build step** - works immediately
- **Hot reload friendly** - updates on code changes

## Tool Configuration

### Development Tools

| Tool | Port | Purpose |
| ---- | ---- | ------- |
| **pgAdmin4** | 5050 | Database GUI + Job monitoring |
| **RedisInsight** | 8001 | Redis cache monitoring |
| **MailDev** | 1080 | Email testing UI |
| **Swagger UI** | /api-docs | API documentation & testing |

### Performance Optimizations

- Connection pooling for PostgreSQL
- Redis connection reuse
- Batch job processing with pg-boss
- Response caching strategies
- Query optimization with proper indexes

## Quick Reference

### Database Connection
```typescript
import { db } from '@/lib/db';

// Query
const users = await db.select().from(usersTable);

// Insert
await db.insert(usersTable).values({ name: 'John' });
```

### Creating Jobs (from API)
```typescript
import { boss } from '@/backend/lib/jobs';
import { db } from '@/backend/lib/db';

// Create one-time job for user
const jobId = await boss.send('send-email', {
  userId: user.id,
  to: user.email,
  subject: 'Welcome!',
  body: 'Thanks for signing up!'
}, {
  retryLimit: 3,
  retryDelay: 60,
  expireInHours: 24
});

// Track job status for user
await db.insert(userJobStatus).values({
  id: jobId,
  userId: user.id,
  tenantId: user.tenantId,
  jobType: 'send-email',
  status: 'pending'
});

// Schedule recurring job for user
await db.insert(userJobSchedules).values({
  userId: user.id,
  jobName: 'sync-user-data',
  cronExpression: '0 0 * * *', // Daily at midnight
  timezone: user.timezone,
  config: { syncType: 'incremental' }
});

// Create the schedule in pg-boss
await boss.schedule(
  `sync-user-data-user-${user.id}`,
  '0 0 * * *',
  'sync-user-data',
  { userId: user.id, ...config }
);
```

### Managing User Job Schedules
```typescript
// Get user's job history
const userJobs = await db.query.userJobStatus.findMany({
  where: eq(userJobStatus.userId, userId),
  orderBy: desc(userJobStatus.createdAt),
  limit: 20
});

// Get job details with pg-boss internals
const jobDetails = await boss.getJobById(jobId);

// Update user's schedule
const scheduleName = `sync-user-data-user-${userId}`;

// First update database
await db.update(userJobSchedules)
  .set({ 
    cronExpression: '0 */6 * * *', // Every 6 hours
    config: { syncType: 'full' }
  })
  .where(
    and(
      eq(userJobSchedules.userId, userId),
      eq(userJobSchedules.jobName, 'sync-user-data')
    )
  );

// Then update pg-boss schedule
await boss.unschedule(scheduleName); // Remove old schedule
await boss.schedule(
  scheduleName,
  '0 */6 * * *',
  'sync-user-data',
  { userId, syncType: 'full' }
);

// Monitor job performance
const stats = await db.sql`
  SELECT 
    job_type,
    COUNT(*) as total,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count
  FROM user_job_status
  WHERE user_id = ${userId}
    AND created_at > NOW() - INTERVAL '7 days'
  GROUP BY job_type
`;
```

### Authentication Check
```typescript
import { getUser } from '@/lib/auth';

export async function protectedRoute(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  // ... protected logic
}
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
WORKER_PORT=8002               # Worker health check port

# Development Tool Ports
MAILDEV_PORT=1080              # MailDev UI port
MAILDEV_SMTP_PORT=1025         # MailDev SMTP port

# Nginx Ports (Production)
NGINX_HTTP_PORT=80             # HTTP port
NGINX_HTTPS_PORT=443           # HTTPS port
```

### Backend Configuration Examples

```typescript
// config/database.ts
export const dbConfig = {
  connectionString: process.env.DATABASE_URL!,
  max: parseInt(process.env.DB_POOL_SIZE || '10'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '2000')
};

// config/redis.ts
export const redisConfig = {
  url: process.env.REDIS_URL!,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
};

// config/api.ts
export const apiConfig = {
  port: parseInt(process.env.API_PORT!),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [],
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 min
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100')
};
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
      REDIS_URL: redis://redis:6379

  worker:
    ports:
      - "${WORKER_PORT:-8002}:8002"
    environment:
      PORT: ${WORKER_PORT:-8002}
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379
      NODE_ENV: ${NODE_ENV:-development}
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Service Architecture

| Service | Responsibility | Scaling Strategy | Health Check |
| ------- | -------------- | ---------------- | ------------ |
| **API** | HTTP requests, creates jobs | Horizontal via load balancer | `/health` endpoint |
| **Worker** | Processes background jobs | Horizontal via pg-boss | `/health` endpoint |
| **Database** | Data persistence | Vertical + read replicas | pg_isready |
| **Redis** | Cache & pub/sub | Vertical + clustering | redis-cli ping |

### Backend-Specific Best Practices

1. **Database Migrations**: Always run in transactions
2. **API Versioning**: Use URL path versioning (`/v1/`, `/v2/`)
3. **Error Handling**: Consistent error response format
4. **Rate Limiting**: Implement per-user and per-IP limits
5. **Request ID**: Add unique request ID for tracing
6. **Graceful Shutdown**: Handle SIGTERM properly

---

# Frontend Guidelines

## UI/UX Principles

| Principle | Description |
| --------- | ----------- |
| **Minimal Design** | Clean, uncluttered interface with focus on content |
| **Performance First** | Fast perceived performance with optimistic UI updates |
| **Responsive** | Mobile-first design that scales to desktop |
| **Accessible** | WCAG 2.1 AA compliance for all components |
| **Progressive Enhancement** | Core functionality works without JavaScript |
| **PicoCSS Framework** | Use PicoCSS via CDN for consistent, semantic styling |

## Frontend Structure

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

## Web Components Architecture

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

## Frontend Standards

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

## Design System

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

## Performance Guidelines

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

## Security Practices

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

## Accessibility Checklist

- [ ] Semantic HTML elements
- [ ] ARIA labels where needed
- [ ] Keyboard navigation support
- [ ] Focus indicators visible
- [ ] Color contrast ratios meet WCAG
- [ ] Screen reader tested
- [ ] Reduced motion support

## Frontend Testing

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

---

# Logger Documentation

This project includes a custom, lightweight logging library designed for both backend and frontend use. The logger provides a consistent API across environments while adapting to platform-specific capabilities.

## IMPORTANT: Mandatory Logger Usage

**ALL console.log, console.error, console.warn, and console.debug statements MUST be replaced with the appropriate logger methods.** This is a strict requirement for all code in this project to ensure:
- Consistent logging format across the codebase
- Proper log persistence in files and localStorage
- Better debugging capabilities with contextual information
- Centralized log management and monitoring

### Migration Requirements
- ❌ NEVER use `console.log()`, `console.error()`, `console.warn()`, or `console.debug()`
- ✅ ALWAYS use `logger.info()`, `logger.error()`, `logger.warn()`, or `logger.debug()`
- ✅ ALWAYS import and use the logger in every module that needs logging
- ✅ ALWAYS include relevant context when logging

### Initial Setup
1. Ensure the `./logger` directory exists (it will be created automatically)
2. Set `LOG_TO_FILE=true` in your `.env` file
3. Logs will be saved as `./logger/app-YYYY-MM-DD.log`
4. All logs will also appear in the terminal with colors and formatting

## Features

- **Unified API**: Same logging interface for both backend and frontend
- **Multiple Log Levels**: ERROR, WARN, INFO, DEBUG
- **Multiple Transports**: Console, File (backend), localStorage (frontend), Remote (frontend)
- **Contextual Logging**: Add metadata to log entries
- **Child Loggers**: Create scoped loggers with inherited context
- **Configurable**: Environment-based configuration
- **Type-Safe**: Full TypeScript support
- **Performant**: Asynchronous transports, batching for remote logs
- **Pretty Formatting**: Colored output with emojis in development

## Quick Start

### Backend Usage

```typescript
import { logger, createLogger } from '@/backend/lib/logger';

// IMPORTANT: With LOG_TO_FILE=true, all logs appear in:
// - Terminal (with colors and emojis)
// - ./logger/app-YYYY-MM-DD.log files

// Use the default logger
logger.info('Application started'); // Shows in terminal + saved to file
logger.error('Something went wrong', { userId: 123 }); // Red in terminal + file

// Create a scoped logger
const authLogger = createLogger({ 
  source: 'auth',
  context: { module: 'authentication' }
});

authLogger.info('User logged in', { userId: 456 });

// Create child logger with additional context
const sessionLogger = authLogger.child({ sessionId: 'abc123' });
sessionLogger.debug('Session created');

// Log errors with stack traces
try {
  someRiskyOperation();
} catch (error) {
  logger.error('Operation failed', error); // Full stack trace in both outputs
}
```

### Frontend Usage

```typescript
import { logger, createLogger, getStoredLogs, clearStoredLogs } from '@/frontend/lib/logger';

// Use the default logger
logger.info('Page loaded');
logger.warn('Slow network detected', { latency: 2000 });

// Create component-specific logger
const componentLogger = createLogger({
  source: 'UserProfile',
  context: { component: 'UserProfile' }
});

componentLogger.debug('Component rendered', { props: { userId: 123 } });

// Access stored logs from localStorage
const recentLogs = getStoredLogs();
console.log('Recent logs:', recentLogs);

// Clear stored logs
clearStoredLogs();

// Set log level dynamically (persisted in localStorage)
import { loggerFactory } from '@/frontend/lib/logger';
loggerFactory.setLogLevel('debug');
```

## Configuration

### Environment Variables (Backend)

```bash
# Log Level (error, warn, info, debug)
LOG_LEVEL=info

# File Logging - RECOMMENDED TO ENABLE IN ALL ENVIRONMENTS
LOG_TO_FILE=true                     # Enable file logging (SHOULD BE true)
LOG_DIR=./logger                     # Directory for log files (uses ./logger folder)
LOG_MAX_SIZE=10485760               # Max log file size in bytes (10MB)
LOG_MAX_FILES=5                     # Number of log files to keep

# Console Output - ALWAYS ENABLED
LOG_EMOJIS=true                     # Enable emojis in console logs (dev)
LOG_COLORS=true                     # Enable colors in console logs
```

### Recommended Backend Configuration

For consistent logging across all environments, use these settings:

```bash
# .env or .env.local
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_DIR=./logger
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=10
LOG_EMOJIS=true
LOG_COLORS=true
```

This ensures:
- All logs are written to files in the `./logger` directory
- Logs are displayed in the terminal with colors and formatting
- Log files are automatically rotated when they reach 10MB
- The last 10 log files are retained for debugging

### Frontend Configuration

```typescript
// Configure the logger factory (usually in main.ts)
import { LoggerFactory } from '@/frontend/lib/logger';

const factory = new LoggerFactory({
  enableLocalStorage: true,          // Store logs in localStorage
  enableRemote: true,                // Send logs to remote endpoint
  remoteEndpoint: '/api/logs',       // Remote logging endpoint
  remoteApiKey: 'your-api-key',     // API key for authentication
  logLevel: 'info',                  // Default log level
});
```

### URL-based Debugging (Frontend)

Add `?log_level=debug` to any URL to temporarily enable debug logging:
```
https://yourapp.com/dashboard?log_level=debug
```

## Log Levels

| Level | Value | Description | Use Case |
|-------|-------|-------------|----------|
| ERROR | 0 | Critical errors | Unrecoverable errors, exceptions |
| WARN  | 1 | Warnings | Degraded functionality, deprecations |
| INFO  | 2 | Information | Normal operations, state changes |
| DEBUG | 3 | Debug info | Detailed debugging information |

## Transports

### Backend Transports

1. **Console Transport** (ALWAYS ENABLED)
   - Pretty formatted with colors and emojis in development
   - JSON formatted in production
   - Outputs to stdout/stderr for terminal visibility
   - Real-time log monitoring in terminal

2. **File Transport** (SHOULD BE ENABLED)
   - Writes to `./logger` directory by default
   - Rotating log files with date patterns (e.g., `app-2024-01-15.log`)
   - Automatic size-based rotation when files reach configured size
   - Configurable retention policy (keeps last N files)
   - Asynchronous writes with queuing for performance
   - Creates logger directory automatically if it doesn't exist

### Frontend Transports

1. **Console Transport**
   - Browser-optimized formatting with CSS styles
   - Collapsed context objects
   - Proper error stack traces

2. **LocalStorage Transport**
   - Stores recent logs in browser localStorage
   - Configurable maximum entries
   - Survives page reloads
   - Useful for debugging user issues

3. **Remote Transport**
   - Batches logs for efficient network usage
   - Automatic retry on failure
   - Filters by minimum log level
   - Uses sendBeacon on page unload

## Advanced Usage

### Custom Context

```typescript
// Backend example with request context
app.use((req, res, next) => {
  req.logger = logger.child({
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// In route handler
app.get('/users/:id', (req, res) => {
  req.logger.info('Fetching user', { userId: req.params.id });
  // All logs will include request context
});
```

### Performance Logging

```typescript
// Log performance metrics
const startTime = performance.now();

// Do some work...

logger.info('Operation completed', {
  duration: performance.now() - startTime,
  operation: 'fetchUserData',
  success: true,
});
```

### Structured Logging

```typescript
// Log structured data for better analysis
logger.info('Order processed', {
  orderId: order.id,
  userId: user.id,
  amount: order.total,
  items: order.items.length,
  paymentMethod: order.payment.method,
  processingTime: Date.now() - startTime,
  tags: ['order', 'payment', 'success'],
});
```

### Error Boundaries (Frontend)

```typescript
// React error boundary example
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React error boundary triggered', {
      error,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
    });
  }
}
```

### Monitoring Integration

```typescript
// Send critical errors to monitoring service
const monitoringLogger = createLogger({
  source: 'monitoring',
});

// Intercept errors
monitoringLogger.child = function(context) {
  const child = CoreLogger.prototype.child.call(this, context);
  const originalError = child.error;
  
  child.error = function(message, context) {
    originalError.call(this, message, context);
    
    // Send to monitoring service
    if (window.Sentry) {
      Sentry.captureMessage(message, 'error');
    }
  };
  
  return child;
};
```

## Terminal Output

The logger provides rich terminal output with the following features:

### Backend Terminal Output
- **Colored Output**: Different colors for each log level (red for errors, yellow for warnings, etc.)
- **Emojis**: Visual indicators for log levels (🚨 ERROR, ⚠️ WARN, ℹ️ INFO, 🐛 DEBUG)
- **Timestamps**: ISO format timestamps for each log entry
- **Source Identification**: Shows which module/component generated the log
- **Structured Context**: Pretty-printed JSON for context objects
- **Stack Traces**: Full error stack traces for debugging

### Viewing Logs in Terminal

```bash
# Real-time log monitoring
tail -f ./logger/app-*.log

# View today's logs with colors
cat ./logger/app-$(date +%Y-%m-%d).log

# Filter by log level
grep "ERROR" ./logger/app-*.log
grep "WARN" ./logger/app-*.log

# Search for specific context
grep "userId: 123" ./logger/app-*.log

# Monitor specific module logs
tail -f ./logger/app-*.log | grep "auth"
```

## Best Practices

1. **Use Appropriate Log Levels**
   - ERROR: Only for actual errors that need attention
   - WARN: For concerning but handled situations
   - INFO: For significant application events
   - DEBUG: For detailed debugging (not in production)

2. **Include Relevant Context**
   ```typescript
   // Good - includes context
   logger.info('User login successful', { 
     userId: user.id, 
     email: user.email,
     loginMethod: 'oauth' 
   });
   
   // Bad - no context
   logger.info('User logged in');
   ```

3. **Use Child Loggers for Modules**
   ```typescript
   // Create module-specific loggers
   const dbLogger = createLogger({ source: 'database' });
   const apiLogger = createLogger({ source: 'api' });
   const authLogger = createLogger({ source: 'auth' });
   ```

4. **Don't Log Sensitive Data**
   ```typescript
   // Bad - logs password
   logger.info('Login attempt', { email, password });
   
   // Good - excludes sensitive data
   logger.info('Login attempt', { email });
   ```

5. **Use Structured Logging**
   ```typescript
   // Structured data is easier to query and analyze
   logger.info('API request completed', {
     method: 'GET',
     path: '/api/users',
     statusCode: 200,
     responseTime: 45,
     userId: req.user?.id,
   });
   ```

## Troubleshooting

### Logs Not Appearing

1. Check log level configuration
2. Verify environment variables are loaded
3. Check if console methods are being overridden
4. For file logs, check write permissions

### Performance Issues

1. Reduce log level in production (ERROR or WARN)
2. Disable file transport if not needed
3. Increase remote transport batch size
4. Use child loggers to avoid recreating context

### Storage Issues (Frontend)

1. localStorage may be full or disabled
2. Clear old logs with `clearStoredLogs()`
3. Reduce `maxEntries` in LocalStorageTransport
4. Disable localStorage transport if not needed

## Migration Guide

### From console.log

```typescript
// Before
console.log('User created:', userId);
console.error('Failed to save:', error);

// After
logger.info('User created', { userId });
logger.error('Failed to save', error);
```

### From Other Loggers

```typescript
// Winston
winston.info('message', { meta: data });
// Becomes
logger.info('message', data);

// Bunyan
log.child({ component: 'auth' }).info('message');
// Becomes
logger.child({ component: 'auth' }).info('message');

// Pino
logger.info({ userId: 123 }, 'User action');
// Becomes
logger.info('User action', { userId: 123 });
```

## API Reference

### Logger Interface

```typescript
interface Logger {
  error(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}
```

### Factory Functions

```typescript
// Create a new logger instance
createLogger(options?: CreateLoggerOptions): Logger

// Options
interface CreateLoggerOptions {
  source?: string;      // Identifies the logger source
  context?: LogContext; // Default context for all logs
  level?: LogLevel;     // Override log level
}
```

### Frontend Helpers

```typescript
// Get logs from localStorage
getStoredLogs(): LogEntry[]

// Clear localStorage logs
clearStoredLogs(): void

// Set log level (persisted)
loggerFactory.setLogLevel(level: LogLevel | string): void
```

## Examples

### API Endpoint Logging

```typescript
// backend/routes/users.ts
import { createLogger } from '@/backend/lib/logger';

const logger = createLogger({ source: 'users-api' });

export async function createUser(req: Request) {
  const requestLogger = logger.child({ 
    requestId: req.id,
    method: 'POST',
    path: '/users',
  });
  
  // This will log to both terminal AND ./logger/app-YYYY-MM-DD.log
  requestLogger.info('Creating user');
  
  try {
    const user = await userService.create(req.body);
    requestLogger.info('User created successfully', { userId: user.id });
    return Response.json(user);
  } catch (error) {
    // Error logs appear in red in terminal and are saved to file
    requestLogger.error('Failed to create user', error);
    return Response.json({ error: 'Creation failed' }, { status: 500 });
  }
}
```

### Component Lifecycle Logging

```typescript
// frontend/components/UserProfile.ts
import { createLogger } from '@/frontend/lib/logger';

const logger = createLogger({ source: 'UserProfile' });

export class UserProfile extends HTMLElement {
  private userId: string;
  private componentLogger: Logger;
  
  constructor() {
    super();
    this.componentLogger = logger.child({ 
      component: 'UserProfile',
      instanceId: crypto.randomUUID(),
    });
  }
  
  connectedCallback() {
    this.componentLogger.debug('Component mounted');
    this.loadUserData();
  }
  
  async loadUserData() {
    this.componentLogger.info('Loading user data', { userId: this.userId });
    
    try {
      const data = await fetchUser(this.userId);
      this.componentLogger.debug('User data loaded', { 
        userId: this.userId,
        dataSize: JSON.stringify(data).length,
      });
    } catch (error) {
      this.componentLogger.error('Failed to load user data', error);
    }
  }
  
  disconnectedCallback() {
    this.componentLogger.debug('Component unmounted');
  }
}
```

### Database Query Logging

```typescript
// backend/lib/db.ts
import { createLogger } from '@/backend/lib/logger';

const logger = createLogger({ source: 'database' });

export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const queryLogger = logger.child({ 
    queryId: crypto.randomUUID(),
    sql: sql.substring(0, 100), // Truncate for logging
  });
  
  queryLogger.debug('Executing query', { params });
  const startTime = Date.now();
  
  try {
    const result = await db.query(sql, params);
    const duration = Date.now() - startTime;
    
    queryLogger.info('Query completed', { 
      duration,
      rowCount: result.rowCount,
    });
    
    return result;
  } catch (error) {
    queryLogger.error('Query failed', error);
    throw error;
  }
}
```

---

# Database Migrations Documentation

This directory contains all database migrations managed by Drizzle Kit.

## Directory Structure

```
migrations/
├── drizzle/          # Auto-generated migration files
│   ├── *.sql        # SQL migration scripts
│   └── meta/        # Drizzle metadata (do not edit)
├── rollback/        # Manual rollback scripts
│   └── *.sql        # Reverse operations for migrations
└── seeds/           # Data seeding scripts
    └── *.ts         # TypeScript seed files
```

## Usage

### Generate a new migration
```bash
# After modifying schema files in backend/models/
bun drizzle-kit generate:pg

# With a descriptive name
bun drizzle-kit generate:pg --name=add_user_roles
```

### Apply migrations
```bash
# Development
bun run scripts/migrate.ts

# Check pending migrations
bun run scripts/migrate.ts --check

# Dry run (show SQL without applying)
bun run scripts/migrate.ts --dry-run
```

### Rollback migrations
```bash
# Rollback last migration
bun run scripts/rollback.ts

# Rollback specific migration
bun run scripts/rollback.ts 0002_add_user_roles.sql

# List applied migrations
bun run scripts/rollback.ts --list
```

### Compare schemas
```bash
# Compare dev vs production
bun run scripts/schema-diff.ts

# Compare specific environments
bun run scripts/schema-diff.ts --from=dev --to=staging
```

## Best Practices

1. **Always test migrations** on a development database first
2. **Create rollback scripts** for complex migrations
3. **Keep migrations small** - one logical change per migration
4. **Use descriptive names** when generating migrations
5. **Never edit** generated migration files after they're applied
6. **Back up production** before applying migrations

## Production Deployment

Production migrations are handled automatically by `scripts/prod.sh`:

1. Checks for pending migrations
2. Creates automatic backup
3. Tests on staging (if configured)
4. Prompts for confirmation
5. Applies migrations
6. Verifies application health

## Rollback Scripts

For each migration that makes destructive changes, create a corresponding rollback script:

1. Copy the migration file to `rollback/`
2. Edit to reverse the changes
3. Test thoroughly on development
4. Keep rollback scripts even after successful deployments

Example:
```sql
-- Migration: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Rollback: Remove NOT NULL constraint
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
```

---

# Infrastructure Configuration

This directory contains all Docker and infrastructure configuration for the project.

## Directory Structure

```
infra/
├── Dockerfile.api              # API service container
├── Dockerfile.frontend         # Frontend development container
├── Dockerfile.frontend.prod    # Frontend production build
├── Dockerfile.worker           # Background worker container
├── docker-compose.dev.yml      # Development environment
├── docker-compose.prod.yml     # Production environment
├── nginx/                      # Nginx configuration
│   ├── nginx.conf             # Main nginx config
│   └── conf.d/                # Site configurations
├── scripts/                    # Infrastructure scripts
└── certbot/                    # SSL certificates (generated)
```

## Quick Start

### Development

```bash
# Start all services
./scripts/dev.sh

# Or manually with docker-compose
docker compose -f infra/docker-compose.dev.yml up
```

### Production

```bash
# Deploy to production
./scripts/prod.sh

# Services will be available at:
# - https://yourdomain.com (frontend)
# - https://yourdomain.com/api (backend API)
```

## Services

### Core Services

| Service | Description | Dev Port | Prod Port |
|---------|-------------|----------|-----------|
| API | Backend REST API | 8000 | 8000 (internal) |
| Worker | Background job processor | 8002 | 8002 (internal) |
| Frontend | Web application | 4001 | 80/443 |
| Database | PostgreSQL 16 | 5432 | 5432 (internal) |
| Redis | Cache & pub/sub | 6379 | 6379 (internal) |

### Development Tools

Available with `--profile tools`:

| Tool | Purpose | Port |
|------|---------|------|
| pgAdmin | Database GUI | 5050 |
| RedisInsight | Redis GUI | 8001 |
| MailDev | Email testing | 1080 |

## Environment Variables

All services are configured via environment variables. See `.env.example` for full documentation.

Key variables:
- `PROJECT_NAME` - Used for container naming
- `DOMAIN_NAME` - Production domain for SSL
- `*_PORT` - All ports are configurable

## SSL/HTTPS

Production deployments automatically:
1. Request Let's Encrypt certificates
2. Configure nginx for HTTPS
3. Set up automatic renewal

## Volumes

Production data is persisted in Docker volumes:
- `postgres-data` - Database files
- `redis-data` - Redis persistence
- `nginx-logs` - Access/error logs

## Backups

The backup service runs daily at 2 AM (configurable via `BACKUP_CRON`).
Backups are stored in `./backups` with automatic rotation.

## Customization

### Adding a New Service

1. Create a Dockerfile in this directory
2. Add service to docker-compose files
3. Update port configuration in .env.example
4. Document in this README

### Nginx Configuration

Templates in `nginx/conf.d/*.template` are processed on deployment with environment variables.

### Health Checks

All services include health checks for proper orchestration and monitoring.