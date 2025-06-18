# Development Workflow

This document describes the automated workflows and operational procedures for development.

## Git Automation & Pre-commit Scripts

### Overview

`scripts/git.ts` automates the entire git workflow with AI-powered commit messages and pre-commit validations.

### Usage

```bash
# Creates a new feature branch based on detected changes
bun scripts/git.ts

# Commits directly to current branch
bun scripts/git.ts main
```

### Pre-commit Scripts (automatically executed by git.ts)

1. **Database Backup** (`backup-sql.sh`)
   - Creates timestamped PostgreSQL backups with schema versioning
   - Filename format: `backup_YYYYMMDD_HHMMSS_GITCOMMIT_SCHEMAVERSION.sql.gz`
   - Includes metadata JSON with timestamp, git commit, and schema hash
   - Automatically compresses and rotates old backups (keeps last 10)
   - Adds `backups/` to .gitignore automatically

2. **Schema Validation** (`validate-schema.ts`)
   - Validates all Drizzle schema files for syntax and structure
   - Ensures each table has corresponding Zod schemas and TypeScript types
   - Checks TypeScript compilation of schema files
   - Validates drizzle.config.ts configuration
   - Fails commit if schemas are invalid

3. **Migration Check** (`check-migrations.ts`)
   - Computes SHA-256 hash of all schema files
   - Compares with last known hash in `migrations/.schema-hash`
   - Automatically generates new migration files when schemas change
   - Stages new migration files for commit
   - Ensures migrations are always in sync with schema changes

4. **API Documentation** (`generate-api-docs.ts`)
   - Regenerates OpenAPI documentation from Zod schemas
   - Updates `docs/openapi.json` for AI assistants
   - Ensures API documentation is always current

### Git Workflow Features

- Automatically detects change type (feat, fix, docs, etc.) and creates smart branch names
- Uses Groq LLM to generate Conventional Commit messages
- Runs all pre-commit scripts with user confirmation on failure
- Handles git add, commit, and push in one command
- Provides fallback for manual commit message if AI fails

## Database Migration Workflow

### Development Process

1. **Make Schema Changes**
   - Edit Drizzle schema files in `src/db/schema/` or feature folders
   - Add/modify tables, columns, or relations

2. **Run Git Automation**
   ```bash
   bun scripts/git.ts
   ```
   This automatically:
   - Creates a backup with current schema version
   - Detects schema changes via hash comparison
   - Generates new migration SQL files
   - Stages everything for commit

3. **Apply Migrations Locally**
   ```bash
   pnpm drizzle-kit migrate
   ```

4. **Verify Changes**
   - Check `migrations/` folder for new SQL files
   - Review generated migration SQL
   - Test application with new schema

### Production Deployment

1. **Pre-deployment**
   - Ensure all migrations are committed to repository
   - Test migrations on staging environment
   - Create production database backup

2. **Deployment Steps**
   ```bash
   # 1. Deploy new code (includes migration files)
   git pull

   # 2. Backup production database
   ./scripts/backup-sql.sh

   # 3. Apply migrations
   pnpm drizzle-kit migrate

   # 4. Verify application
   ```

3. **Rollback Plan**
   - Keep previous deployment artifacts
   - Use timestamped backups for data recovery
   - Schema version in backup filename helps identify correct restore point

### Migration Best Practices

- **Never edit existing migrations** - always create new ones
- **Schema version tracking** - `migrations/.schema-hash` tracks current state
- **Backup correlation** - Backup files include git commit and schema version
- **Test on staging** - Always test migrations with production-like data
- **Small, focused changes** - Keep migrations atomic and reversible

### Troubleshooting

**Schema changes not detected:**
- Check if schema files are in expected locations
- Verify `check-migrations.ts` is reading correct paths
- Manually run `bun scripts/check-migrations.ts` to debug

**Migration generation fails:**
- Ensure `drizzle.config.ts` is properly configured
- Check for TypeScript errors in schema files
- Run `bun scripts/validate-schema.ts` to find issues

**Backup restoration:**
```bash
# List available backups
ls -la backups/

# Restore specific backup
gunzip -c backups/backup_TIMESTAMP_COMMIT_SCHEMA.sql.gz | \
  docker exec -i myapp-db psql -U postgres myapp
```

## Feature Development Flow (Checklist)

1. **Define scope and create domain folder**

   * Write user story and acceptance criteria.
   * Create `/features/<feature>` folder (components, hooks, services, `schema.ts`).

2. **Design / update data model**

   * Edit Drizzle schema in `schema.ts`.
   * Run `pnpm drizzle-kit generate` to create migration.
   * Apply migration with `pnpm drizzle-kit migrate` (runs inside `db` container).

3. **Add Zod validation**

   * Export Zod schema next to the Drizzle table.
   * `export type NewItem = z.infer<typeof newItemSchema>` for shared types.

4. **Implement backend procedure**

   * Create/extend router in `/features/<feature>/router.ts`.
   * Add `publicProcedure` (query or mutation) with input Zod schema and typed output.

5. **Expose through Server Component or Server Action**

   * In `app/<route>/page.tsx` or `action.ts`, call Drizzle directly or via tRPC.

6. **Create client hook**

   * `useCreateItem` or `useItems` using TanStack Query + tRPC client.

7. **Build UI**

   * UI pieces in `/features/<feature>/components` using Tailwind + shadcn/ui.
   * Form uses React Hook Form with Zod resolver.

8. **Integrate page**

   * Add route segment in `app/<route>` using Client Component that invokes the hook and renders UI.

9. **Add per-user background sync job**

   * Create job logic in `worker/jobs/<feature>.ts` that loads user context and fetches external data (e.g., Amazon).
   * Use Zod to validate response and insert into the DB using Drizzle.

10. **Schedule repeatable job per user**

    * In signup flow or admin panel, add:

      ```ts
      await queue.add(`sync-user-${userId}`, { userId }, {
        repeat: { cron: user.syncFrequency },
        removeOnComplete: true
      })
      ```
    * Log `lastSyncedAt`, `syncStatus`, etc., to a sync log table or user record.

11. **Monitor jobs in Bull Board**

    * Open `http://localhost:3001` for job dashboard.
    * Filter by job name or userId.

12. **Update documentation**

    * Add `/docs/<feature>.md` explaining API, schema, and UI usage.
    * Add Storybook story if UI component.

## Docker Development Workflow

### Starting Development Environment

```bash
./scripts/dev.sh
```

This script:
- Loads configuration from `.env.local`
- Starts all containers with hot reload enabled
- Uses project-specific container names (from `PROJECT_NAME` env var)
- Enables Docker Compose Bake for better build performance
- Tails logs for active development services
- Ensures no conflicts with other projects

### Container Naming Convention

All containers follow: `${PROJECT_NAME}-service`
- `${PROJECT_NAME}-frontend`
- `${PROJECT_NAME}-api`
- `${PROJECT_NAME}-db`
- `${PROJECT_NAME}-redis`
- `${PROJECT_NAME}-scheduler`

The `PROJECT_NAME` is configured in `.env.local`

### Log Format

All containers must output logs with timestamps:
```
20240315-143022 [INFO] Server started on port 3000
```

### Production Deployment

```bash
./scripts/prod.sh
```

This script:
- Loads configuration from `.env.local` or `.env.production`
- Processes nginx configuration templates with environment variables
- Always uses SSL/HTTPS configuration
- Handles initial SSL certificate generation via Let's Encrypt
- Sets up automatic certificate renewal
- Imports database schema from `infra/db-schemas/`
- Enables Docker Compose Bake for better build performance

Includes additional services:
- Nginx reverse proxy with SSL termination
- Certbot for SSL certificate management
- Automatic certificate renewal (runs every 12 hours)
- Database backup service
- Optional monitoring stack (Prometheus/Grafana)

### SSL Certificate Setup

For initial SSL setup:
```bash
./infra/scripts/init-letsencrypt.sh
```

This handles:
- Processing nginx templates with environment variables
- Requesting certificates from Let's Encrypt
- Creating certificate symlinks
- Configuring automatic renewal
