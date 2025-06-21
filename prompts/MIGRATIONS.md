# Database Migrations

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