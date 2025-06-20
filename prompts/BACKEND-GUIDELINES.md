# Backend Guidelines

This document covers backend-specific architecture, database design, job processing, and API patterns.

> **Note**: For general project guidelines, see GENERAL-GUIDELINES.md

## 🗄️ Database Architecture

### Core Principles

| Principle | Description |
| --------- | ----------- |
| **Data Persistence** | ALL credentials and data stored in PostgreSQL - no local files or in-memory storage |
| **Volume Continuity** | Database persists between Docker restarts via data volumes |
| **Version Control** | Migrations are version-controlled and immutable after creation |
| **Schema Tracking** | Changes tracked via SHA-256 hashing, correlated with git commits |
| **Transaction Safety** | All migrations run in transactions with automatic rollback on failure |

## 🚀 Cache & Job Queue

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

## ⏰ Worker & Job Management

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
  console.log('Worker shutting down...');
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

### Monitoring
Monitor jobs using SQL queries directly on PostgreSQL:
```sql
-- View active jobs
SELECT * FROM pgboss.job WHERE state = 'active';

-- User job statistics
SELECT u.email, COUNT(j.*) as total_jobs, 
       SUM(CASE WHEN j.status = 'completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN j.status = 'failed' THEN 1 ELSE 0 END) as failed
FROM user_job_status j
JOIN users u ON j.user_id = u.id
WHERE j.created_at > NOW() - INTERVAL '24 hours'
GROUP BY u.email;

-- Job performance metrics
SELECT job_type, 
       percentile_cont(0.5) WITHIN GROUP (ORDER BY completed_at - started_at) as median_duration,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY completed_at - started_at) as p95_duration
FROM user_job_status
WHERE status = 'completed'
GROUP BY job_type;
```

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
│   ├── cache.ts        # Redis client
│   └── jobs.ts         # pg-boss setup & job handlers
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

## 🛠️ Development Standards

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

1. **Define schemas with Zod** for all endpoints
2. **Run** `bun run scripts/generate-docs.ts` to generate OpenAPI
3. **Commit** `docs/openapi.json` for AI assistants

## 🔧 Tool Configuration

### Development Tools

| Tool | Port | Purpose |
| ---- | ---- | ------- |
| **pgAdmin4** | 5050 | Database GUI + Job monitoring |
| **RedisInsight** | 8001 | Redis cache monitoring |
| **MailDev** | 1080 | Email testing UI |
| **Custom Dashboard** | 3001 | Optional job status dashboard |

### Performance Optimizations

- Connection pooling for PostgreSQL
- Redis connection reuse
- Batch job processing with pg-boss
- Response caching strategies
- Query optimization with proper indexes

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
DASHBOARD_PORT=3001            # Optional custom job dashboard

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

## 🏗️ Service Architecture

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