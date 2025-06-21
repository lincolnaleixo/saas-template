# Job Queue Architecture Decision

After extensive research on production job queue systems for multi-tenant SaaS in 2024, here's my recommendation:

## 🎯 Recommended Solution: PostgreSQL-based Queue (pg-boss or graphile-worker)

### Why PostgreSQL-based over BullMQ/Redis?

| Aspect | PostgreSQL Queue | BullMQ/Redis |
|--------|------------------|--------------|
| **Infrastructure** | Uses existing DB | Requires Redis cluster |
| **Data Consistency** | ACID guarantees | Eventual consistency |
| **Job History** | Built-in archival | Manual implementation |
| **Multi-tenant** | Row-level security | Queue separation |
| **Monitoring** | SQL queries | External tools |
| **Cost** | No additional infrastructure | Redis hosting costs |
| **Backup** | With your DB backup | Separate Redis backup |

## 📊 Architecture for 100+ Users

### Database Schema
```sql
-- Core job tables (managed by pg-boss/graphile-worker)
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'created',
  retry_limit INTEGER NOT NULL DEFAULT 3,
  retry_count INTEGER NOT NULL DEFAULT 0,
  retry_delay INTEGER NOT NULL DEFAULT 0,
  retry_backoff BOOLEAN NOT NULL DEFAULT false,
  start_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_on TIMESTAMPTZ,
  singleton_key TEXT,
  singleton_on TIMESTAMPTZ,
  expire_in INTERVAL NOT NULL DEFAULT interval '15 minutes',
  created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_on TIMESTAMPTZ,
  output JSONB,
  
  -- Multi-tenant fields
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Indexes for performance
  INDEX idx_tenant_state (tenant_id, state),
  INDEX idx_user_jobs (user_id, created_on DESC),
  INDEX idx_job_scheduling (state, start_after) WHERE state = 'created'
);

-- User-visible job status (denormalized for fast queries)
CREATE TABLE user_job_status (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- 0-100
  message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_user_status (user_id, status, created_at DESC)
);

-- Job schedules per user
CREATE TABLE user_job_schedules (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  job_type VARCHAR(50) NOT NULL,
  cron_expression VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  UNIQUE(user_id, job_type)
);
```

### Implementation with pg-boss

```typescript
// backend/lib/jobs.ts
import PgBoss from 'pg-boss';
import { db } from './db';

// Initialize pg-boss with existing database connection
export const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  schema: 'pgboss', // Separate schema for job tables
  
  // Multi-tenant configuration
  newJobCheckInterval: 1000, // Check for new jobs every second
  
  // Archive completed jobs for 30 days
  archiveCompletedAfterSeconds: 60 * 60 * 24 * 30,
  
  // Monitor configuration
  monitorStateIntervalSeconds: 10,
});

// Start pg-boss
await boss.start();

// Job handlers with tenant context
export const jobHandlers = {
  'sync-user-data': async (job: PgBoss.Job<SyncJobData>) => {
    const { userId, tenantId } = job.data;
    
    // Update user-visible status
    await updateUserJobStatus(job.id, userId, 'running', 0, 'Starting sync...');
    
    try {
      // Perform sync with progress updates
      for (let i = 0; i <= 100; i += 10) {
        await performSyncStep(userId, i);
        await updateUserJobStatus(job.id, userId, 'running', i, `Syncing... ${i}%`);
      }
      
      await updateUserJobStatus(job.id, userId, 'completed', 100, 'Sync completed');
      return { success: true };
      
    } catch (error) {
      await updateUserJobStatus(job.id, userId, 'failed', 0, error.message);
      throw error;
    }
  },
  
  'generate-report': async (job: PgBoss.Job<ReportJobData>) => {
    // Similar pattern...
  }
};

// Register all handlers
for (const [jobName, handler] of Object.entries(jobHandlers)) {
  await boss.work(jobName, { teamSize: 5, teamConcurrency: 2 }, handler);
}

// Helper to update user-visible status
async function updateUserJobStatus(
  jobId: string,
  userId: string,
  status: string,
  progress: number,
  message: string
) {
  await db.upsert(userJobStatus).values({
    id: jobId,
    userId,
    status,
    progress,
    message,
    updatedAt: new Date()
  });
}
```

### API for User Job Management

```typescript
// backend/routes/jobs.ts
import { boss } from '@/lib/jobs';

// Create a job for user
export async function createUserJob(req: Request) {
  const user = await getUser(req);
  const { jobType, data } = await validateBody(req, createJobSchema);
  
  // Create job with tenant context
  const jobId = await boss.send(jobType, {
    ...data,
    userId: user.id,
    tenantId: user.tenantId
  }, {
    // Tenant-specific queue to prevent noisy neighbors
    singletonKey: `${jobType}-${user.id}`,
    retryLimit: 3,
    expireInHours: 24
  });
  
  // Create user-visible status record
  await db.insert(userJobStatus).values({
    id: jobId,
    userId: user.id,
    jobType,
    status: 'pending',
    progress: 0
  });
  
  return Response.json({ jobId });
}

// Get user's job history with pagination
export async function getUserJobs(req: Request) {
  const user = await getUser(req);
  const { page = 1, limit = 20, status } = getQueryParams(req);
  
  const jobs = await db.query.userJobStatus.findMany({
    where: and(
      eq(userJobStatus.userId, user.id),
      status ? eq(userJobStatus.status, status) : undefined
    ),
    orderBy: desc(userJobStatus.createdAt),
    limit,
    offset: (page - 1) * limit
  });
  
  return Response.json({ jobs });
}

// Get real-time job status
export async function getJobStatus(req: Request, { jobId }: { jobId: string }) {
  const user = await getUser(req);
  
  const status = await db.query.userJobStatus.findFirst({
    where: and(
      eq(userJobStatus.id, jobId),
      eq(userJobStatus.userId, user.id)
    )
  });
  
  if (!status) {
    return new Response('Job not found', { status: 404 });
  }
  
  return Response.json(status);
}

// Update user's job schedule
export async function updateJobSchedule(req: Request) {
  const user = await getUser(req);
  const { jobType, cronExpression, isActive } = await validateBody(req, updateScheduleSchema);
  
  // Update schedule in database
  await db.upsert(userJobSchedules).values({
    userId: user.id,
    jobType,
    cronExpression,
    isActive
  });
  
  // Update pg-boss schedule
  if (isActive && cronExpression) {
    await boss.schedule(
      `${jobType}-${user.id}`, // Unique schedule name per user
      cronExpression,
      { userId: user.id, tenantId: user.tenantId },
      { tz: user.timezone }
    );
  } else {
    await boss.unschedule(`${jobType}-${user.id}`);
  }
  
  return Response.json({ success: true });
}
```

### Frontend Job Status Component

```typescript
// frontend/components/JobStatus.ts
export class JobStatus extends HTMLElement {
  private jobId: string;
  private pollInterval: number;
  
  connectedCallback() {
    this.jobId = this.getAttribute('job-id');
    this.render();
    this.startPolling();
  }
  
  disconnectedCallback() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
  
  async startPolling() {
    // Poll every 2 seconds while job is running
    this.pollInterval = setInterval(async () => {
      const response = await fetch(`/api/jobs/${this.jobId}/status`);
      const status = await response.json();
      
      this.updateDisplay(status);
      
      // Stop polling when job is done
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(this.pollInterval);
      }
    }, 2000);
  }
  
  updateDisplay(status: JobStatus) {
    this.innerHTML = `
      <div class="job-status ${status.status}">
        <h4>${this.getJobTypeLabel(status.jobType)}</h4>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${status.progress}%"></div>
        </div>
        <p class="status-message">${status.message}</p>
        ${status.status === 'failed' ? `<p class="error">${status.errorMessage}</p>` : ''}
      </div>
    `;
  }
}

customElements.define('job-status', JobStatus);
```

## 🚀 Why This Architecture Scales

### 1. **Performance at Scale**
- PostgreSQL can handle 10k+ jobs/second with proper indexing
- Tenant isolation through row-level security
- Connection pooling reduces overhead

### 2. **Monitoring Built-In**
```sql
-- Real-time dashboard queries
-- Jobs per user
SELECT user_id, COUNT(*) as job_count, 
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
FROM user_job_status
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id;

-- System health
SELECT job_type, status, COUNT(*) as count
FROM user_job_status
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY job_type, status;
```

### 3. **Cost Effective**
- No additional Redis infrastructure
- Backups included with database
- Single system to monitor

### 4. **Developer Experience**
- SQL for debugging
- Type-safe with TypeScript
- Built-in job history

## 🔄 Alternative: If You Must Use BullMQ

If your team prefers Redis/BullMQ:

```typescript
// Use queue prefixes for multi-tenancy
const userQueue = new Queue(`tenant-${tenantId}-${userId}`, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: false, // Keep for history
    removeOnFail: false
  }
});

// Store job status in PostgreSQL for fast queries
userQueue.on('completed', async (job) => {
  await db.update(userJobStatus)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(userJobStatus.id, job.id));
});
```

## 📝 Final Recommendation

**Use pg-boss or graphile-worker** because:
1. Simpler infrastructure (just PostgreSQL)
2. Better multi-tenant isolation
3. Built-in job history and archival
4. Easy monitoring with SQL
5. ACID guarantees for job processing
6. Cost effective at scale

Your 100 concurrent users is well within PostgreSQL's capabilities, and you get all the benefits of a unified data layer.