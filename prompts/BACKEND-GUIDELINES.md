
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


│  ├─ server.ts                ← Bun.serve entry
│  ├─ routes/
│  │   ├─ _manifest.ts         ← auto‑generated registry
│  │   └─ healthcheck.ts       ← example GET /health
│  ├─ jobs/
│  │   └─ nightly‑summary.ts   ← cron demo
│  ├─ lib/
│  │   ├─ db.ts                ← Drizzle client & helpers
│  │   └─ auth.ts              ← Lucia session helpers

FOR THE API:

Use organized structure , like:

/backend
├── /routes          # Route definitions (maps URL paths to controllers)
│   ├── index.ts     # Main route file
│   └── userRoutes.ts
│
├── /controllers     # Request handlers (handle logic per route)
│   └── userController.ts
│
├── /services        # Business logic (used by controllers)
│   └── userService.ts
│
├── /models          # Data models (e.g., ORM schemas or interfaces)
│   └── userModel.ts
│
├── /middlewares     # Middleware functions
│   └── authMiddleware.ts
│
├── /utils           # Helper functions
│   └── hashPassword.ts
│
├── /config          # Configuration files (env, DB, etc.)
│   └── db.ts
│
├── /types           # TypeScript custom types and interfaces
│   └── user.d.ts
│
└── app.ts           # Main app setup (register routes, middlewares)

Keys Principles:
	•	Keep controllers thin: delegate to services.
	•	Use async/await for service calls.
	•	Separate validation: consider a /validators folder or use middleware.
	•	**IMPORTANT**: Follow the API_DEVELOPMENT_GUIDE.md when creating new routes to ensure automatic documentation works properly.