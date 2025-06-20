# Backend Guidelines

This document defines the backend architecture, database principles, and API development standards.

## 🗄️ Database Architecture

### Core Principles

| Principle | Description |
| --------- | ----------- |
| **Data Persistence** | ALL credentials and data stored in PostgreSQL - no local files or in-memory storage |
| **Volume Continuity** | Database persists between Docker restarts via data volumes |
| **Version Control** | Migrations are version-controlled and immutable after creation |
| **Schema Tracking** | Changes tracked via SHA-256 hashing, correlated with git commits |
| **Transaction Safety** | All migrations run in transactions with automatic rollback on failure |

### Migration Workflow
See `workflow.md` for detailed migration procedures.

## 🚀 Cache & Job Queue

### Redis Architecture

| Component | Purpose |
| --------- | ------- |
| **Sessions** | Ephemeral user session storage |
| **Rate Limiting** | API rate limit counters |
| **BullMQ** | Background job queue management |
| **Pub/Sub** | Real-time event broadcasting (optional) |

## ⏰ Worker & Job Management

### Architecture Overview

The project uses a **separate worker service** for background jobs:

| Service | Purpose | Entry Point |
| ------- | ------- | ----------- |
| **API** | Handles HTTP requests, creates jobs | `/backend/server.ts` |
| **Worker** | Processes background jobs | `/worker/index.ts` |

Both services share the same codebase but run as separate Docker containers.

### Database-Driven Job Configuration

Jobs are stored in the database for dynamic management:

```sql
-- Example job_definitions table
CREATE TABLE job_definitions (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'cron', 'repeat', 'once'
  cron_expression VARCHAR(100),
  repeat_interval INTEGER, -- milliseconds
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User-specific job instances
CREATE TABLE user_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  job_definition_id UUID NOT NULL REFERENCES job_definitions(id),
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Job Implementation Pattern

```typescript
// worker/jobs/sync-user-data.ts
export async function syncUserData(job: Job) {
  const { userId, config } = job.data;
  
  // Load user-specific settings from database
  const userJob = await db.query.userJobs.findFirst({
    where: eq(userJobs.userId, userId)
  });
  
  // Process the job
  await performSync(userId, userJob.metadata);
  
  // Update last run timestamp
  await db.update(userJobs)
    .set({ lastRunAt: new Date() })
    .where(eq(userJobs.id, userJob.id));
}

// worker/index.ts - Worker entry point
import { Worker } from 'bullmq';

// Load job definitions from database on startup
const jobDefs = await db.query.jobDefinitions.findMany({
  where: eq(jobDefinitions.isActive, true)
});

// Register workers for each job type
jobDefs.forEach(def => {
  new Worker(def.name, async (job) => {
    const handler = await import(`./jobs/${def.name}`);
    return handler.default(job);
  }, {
    connection: redis,
    concurrency: 10
  });
});
```

### Job Management Features

| Feature | Description |
| ------- | ----------- |
| **Dynamic Registration** | Jobs loaded from database at worker startup |
| **Per-User Configuration** | Each user can have custom job settings |
| **Runtime Updates** | Enable/disable jobs without code changes |
| **Audit Trail** | Track job execution history in database |
| **Multi-Tenant** | Different job schedules per user/tenant |

### Monitoring
Access Bull Board at `http://localhost:3001` to monitor:
- Job status and execution history
- Next scheduled runs for repeating jobs
- Failed jobs and retry attempts
- Queue metrics and performance

## 📁 Backend Structure

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
│   └── cache.ts        # Redis client
├── utils/              # Helper functions
│   └── crypto.ts
├── config/             # Configuration
│   └── env.ts
└── types/              # TypeScript definitions
    └── api.d.ts

worker/                  # Separate worker service
├── index.ts            # Worker entry point
├── jobs/               # Job handlers
│   ├── sync-data.ts
│   ├── send-email.ts
│   └── cleanup.ts
└── lib/               # Shared utilities
    └── job-loader.ts  # Database job loader
```

## 🛠️ Development Standards

### API Design Principles

1. **Thin Controllers** - Controllers only handle HTTP concerns
   ```typescript
   // ✅ CORRECT - Thin controller
   export async function createUser(req: Request) {
     const data = await validateBody(req, createUserSchema);
     const user = await userService.create(data);
     return Response.json(user, { status: 201 });
   }
   ```

2. **Business Logic in Services** - All logic belongs in service layer
   ```typescript
   // services/user.service.ts
   export async function create(data: CreateUserDTO) {
     // Business rules, validation, database calls
     const hashedPassword = await hashPassword(data.password);
     return db.insert(users).values({ ...data, password: hashedPassword });
   }
   ```

3. **Zod Schema Validation** - All inputs validated with Zod
   ```typescript
   export const createUserSchema = z.object({
     email: z.string().email(),
     password: z.string().min(8),
     name: z.string().min(2)
   });
   ```

### Automatic API Documentation

1. **Define schemas with Zod** for all endpoints
2. **Run** `bun run scripts/generate-docs.ts` to generate OpenAPI
3. **Commit** `docs/openapi.json` for AI assistants

### Package Management

| Command | Purpose |
| ------- | ------- |
| `bun install` | Install dependencies |
| `bun run dev` | Start development server |
| `bun test` | Run test suite |
| `bun run build` | Build for production |

**NEVER use npm, yarn, or node commands**

## 🔧 Tool Configuration

### Development Tools

| Tool | Port | Purpose |
| ---- | ---- | ------- |
| **pgAdmin4** | 5050 | Database GUI |
| **RedisInsight** | 8001 | Redis GUI |
| **Bull Board** | 3001 | Job queue monitoring |
| **MailDev** | 1080 | Email testing UI |

### Performance Settings
- Docker: `COMPOSE_BAKE=true` enabled by default
- TypeScript: Strict mode with `es2022` target
- ESLint 9 with Prettier integration

## ⚡ Quick Reference

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
import { queue } from '@/lib/queue';

// One-time job
await queue.add('send-email', {
  to: 'user@example.com',
  subject: 'Welcome!'
});

// Repeating job for user
await queue.add('sync-user-data', 
  { userId: user.id },
  { 
    repeat: { 
      pattern: userJob.cronExpression 
    }
  }
);
```

### Database-Driven Job Management
```typescript
// Enable/disable jobs at runtime
await db.update(jobDefinitions)
  .set({ isActive: false })
  .where(eq(jobDefinitions.name, 'daily-report'));

// Update user job schedule
await db.update(userJobs)
  .set({ 
    metadata: { 
      ...userJob.metadata, 
      syncInterval: '0 */6 * * *' // Every 6 hours
    }
  })
  .where(eq(userJobs.userId, userId));
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

## 🔌 Docker Port Configuration

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
BULL_BOARD_PORT=3001           # Bull Board UI port

# Development Tool Ports
MAILDEV_PORT=1080              # MailDev UI port
MAILDEV_SMTP_PORT=1025         # MailDev SMTP port

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
      REDIS_URL: redis://redis:6379

  worker:
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis
```

## 🚢 Development & Deployment Principles

### Docker Standards

* Container logs must include timestamps: `YYYYMMDD-HHMMSS [level] message`
* Image naming convention: `myapp-service` (e.g., `myapp-api`, `myapp-worker`)
* Project isolation: scripts must only manage project-specific containers
* Everything runs in containers - no local dependencies

### Service Architecture

| Service | Responsibility | Scaling |
| ------- | -------------- | ------- |
| **API** | HTTP requests, creates jobs | Horizontal |
| **Worker** | Processes background jobs | Horizontal |
| **Database** | Data persistence | Vertical |
| **Redis** | Cache & job queues | Vertical |