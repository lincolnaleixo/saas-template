#!/usr/bin/env bun
/**
 * @file migrate.ts
 * @description Database migration runner using Drizzle Kit
 *              Automatically backs up database before applying migrations
 *              Supports both development and production environments
 * 
 * Usage:
 *   bun run scripts/migrate.ts           - Apply all pending migrations
 *   bun run scripts/migrate.ts --check   - Check for pending migrations only
 *   bun run scripts/migrate.ts --dry-run - Show SQL that would be executed
 * 
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string
 *   NODE_ENV - Environment (development/production)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isCheckOnly = args.includes('--check');

// Environment configuration
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Initialize database connection
const sql = postgres(DATABASE_URL, {
  max: 1,
  onnotice: isDryRun ? () => {} : undefined,
});

const db = drizzle(sql);

/**
 * Generate SHA-256 hash of current schema files
 */
async function generateSchemaHash(): Promise<string> {
  const modelsDir = './backend/models';
  
  try {
    const files = await fs.readdir(modelsDir);
    const modelFiles = files.filter(f => f.endsWith('.model.ts'));
    
    const contents = await Promise.all(
      modelFiles.map(async (file) => {
        const content = await fs.readFile(path.join(modelsDir, file), 'utf-8');
        return `// ${file}\n${content}`;
      })
    );
    
    return createHash('sha256')
      .update(contents.join('\n'))
      .digest('hex');
  } catch (error) {
    console.warn('⚠️  Could not generate schema hash:', error.message);
    return 'unknown';
  }
}

/**
 * Count pending migrations
 */
async function countPendingMigrations(): Promise<number> {
  try {
    // Check if migrations table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = '__drizzle_migrations'
      );
    `;
    
    if (!tableExists[0].exists) {
      // Table doesn't exist, all migrations are pending
      const migrationFiles = await fs.readdir('./migrations/drizzle').catch(() => []);
      return migrationFiles.filter(f => f.endsWith('.sql')).length;
    }
    
    // Get applied migrations
    const applied = await sql`
      SELECT version FROM __drizzle_migrations;
    `;
    
    const appliedVersions = new Set(applied.map(row => row.version));
    
    // Count migration files
    const migrationFiles = await fs.readdir('./migrations/drizzle').catch(() => []);
    const allMigrations = migrationFiles.filter(f => f.endsWith('.sql'));
    
    // Count pending
    const pending = allMigrations.filter(f => !appliedVersions.has(f));
    
    return pending.length;
  } catch (error) {
    console.error('Error counting migrations:', error);
    return 0;
  }
}

/**
 * Display migration status
 */
async function showMigrationStatus(): Promise<void> {
  const pending = await countPendingMigrations();
  
  if (pending === 0) {
    console.log('✅ Database schema is up to date');
  } else {
    console.log(`📋 ${pending} pending migration(s) found`);
    
    // List pending migrations
    try {
      const applied = await sql`
        SELECT version FROM __drizzle_migrations;
      `.catch(() => []);
      
      const appliedVersions = new Set(applied.map(row => row.version));
      const migrationFiles = await fs.readdir('./migrations/drizzle').catch(() => []);
      
      const pendingFiles = migrationFiles
        .filter(f => f.endsWith('.sql'))
        .filter(f => !appliedVersions.has(f))
        .sort();
      
      console.log('\nPending migrations:');
      pendingFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
    } catch (error) {
      // Ignore errors in listing
    }
  }
}

/**
 * Run database backup
 */
async function createBackup(): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log('💾 Creating database backup...');
    
    try {
      // Try to run backup script
      const backupScripts = [
        './scripts/backup-sql.sh',
        './dev/backup-sql.sh',
        './backup-sql.sh'
      ];
      
      let backupSuccess = false;
      for (const script of backupScripts) {
        try {
          if (await fs.access(script).then(() => true).catch(() => false)) {
            execSync(`bash ${script}`, { stdio: 'inherit' });
            backupSuccess = true;
            break;
          }
        } catch (error) {
          // Try next script
        }
      }
      
      if (backupSuccess) {
        console.log('✅ Backup completed successfully');
        return true;
      } else {
        console.warn('⚠️  No backup script found');
        return false;
      }
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      return false;
    }
  }
  
  // In production, backup is handled by prod.sh
  return true;
}

/**
 * Main migration runner
 */
async function runMigrations(): Promise<void> {
  console.log(`🔄 Database Migration Tool (${NODE_ENV})`);
  console.log('━'.repeat(50));
  
  try {
    // Check migration status
    await showMigrationStatus();
    
    if (isCheckOnly) {
      await sql.end();
      process.exit(0);
    }
    
    const pending = await countPendingMigrations();
    
    if (pending === 0) {
      await sql.end();
      process.exit(0);
    }
    
    console.log('');
    
    // Create backup before migrations (unless in production)
    if (!isDryRun && IS_PRODUCTION) {
      console.log('⚠️  Production mode - ensure backup exists before proceeding');
    } else if (!isDryRun) {
      const backupSuccess = await createBackup();
      if (!backupSuccess && IS_PRODUCTION) {
        console.error('❌ Cannot proceed without backup in production');
        await sql.end();
        process.exit(1);
      }
    }
    
    if (isDryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
      console.log('Migrations that would be applied:');
      
      // Show pending migration files
      const migrationFiles = await fs.readdir('./migrations/drizzle').catch(() => []);
      for (const file of migrationFiles.filter(f => f.endsWith('.sql'))) {
        const content = await fs.readFile(path.join('./migrations/drizzle', file), 'utf-8');
        console.log(`\n📄 ${file}:`);
        console.log('─'.repeat(40));
        console.log(content);
        console.log('─'.repeat(40));
      }
    } else {
      // Run migrations
      console.log('\n🚀 Applying migrations...\n');
      
      await migrate(db, {
        migrationsFolder: './migrations/drizzle',
        migrationsTable: '__drizzle_migrations',
      });
      
      // Update schema hash
      const schemaHash = await generateSchemaHash();
      await fs.writeFile('./migrations/.schema-hash', schemaHash);
      
      console.log('\n✅ Migrations completed successfully');
      console.log(`📁 Schema hash: ${schemaHash.substring(0, 8)}`);
      
      // Show final status
      console.log('\n' + '━'.repeat(50));
      await showMigrationStatus();
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check DATABASE_URL is correct');
    console.error('   2. Ensure database is accessible');
    console.error('   3. Review migration files for syntax errors');
    console.error('   4. Restore from backup if needed');
    
    await sql.end();
    process.exit(1);
  }
  
  await sql.end();
}

// Execute migrations
runMigrations();