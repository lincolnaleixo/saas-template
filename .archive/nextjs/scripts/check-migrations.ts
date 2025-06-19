#!/usr/bin/env bun
/**
 * @file check-migrations.ts
 * @description Pre-commit script that detects schema changes and generates migrations
 * 
 * This script ensures database migrations are always in sync with schema changes:
 * 1. Computes SHA-256 hash of all schema files
 * 2. Compares with last known hash stored in migrations/.schema-hash
 * 3. Auto-generates migration SQL if schemas changed
 * 4. Stages new migrations for commit
 * 
 * This prevents the common problem of forgetting to create migrations
 * when changing database schemas, ensuring production deployments
 * always have the correct migration files.
 * 
 * The script is run automatically by git.ts during commits
 * but can also be run manually: bun scripts/check-migrations.ts
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';

const execAsync = promisify(exec);

// Configuration
const SCHEMA_DIR = './src/db/schema';
const MIGRATIONS_DIR = './migrations';
const DRIZZLE_CONFIG = './drizzle.config.ts';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getSchemaHash(): Promise<string> {
  const schemaFiles: string[] = [];
  
  // Read all .ts files from schema directory
  if (await fileExists(SCHEMA_DIR)) {
    const files = await fs.promises.readdir(SCHEMA_DIR);
    for (const file of files) {
      if (file.endsWith('.ts')) {
        const content = await fs.promises.readFile(path.join(SCHEMA_DIR, file), 'utf-8');
        schemaFiles.push(content);
      }
    }
  }
  
  // Also check for single schema file
  const singleSchemaPath = './src/db/schema.ts';
  if (await fileExists(singleSchemaPath)) {
    const content = await fs.promises.readFile(singleSchemaPath, 'utf-8');
    schemaFiles.push(content);
  }
  
  // Create hash of all schema content
  const combinedContent = schemaFiles.sort().join('\n');
  return crypto.createHash('sha256').update(combinedContent).digest('hex');
}

async function getLastMigrationHash(): Promise<string | null> {
  const hashFile = path.join(MIGRATIONS_DIR, '.schema-hash');
  
  if (await fileExists(hashFile)) {
    return await fs.promises.readFile(hashFile, 'utf-8');
  }
  
  return null;
}

async function saveSchemaHash(hash: string): Promise<void> {
  const hashFile = path.join(MIGRATIONS_DIR, '.schema-hash');
  await fs.promises.mkdir(MIGRATIONS_DIR, { recursive: true });
  await fs.promises.writeFile(hashFile, hash);
}

async function checkForPendingMigrations(): Promise<boolean> {
  try {
    // Check if there are any unapplied migrations
    const { stdout } = await execAsync('pnpm drizzle-kit check');
    return stdout.includes('pending migrations');
  } catch (error) {
    // If command fails, assume no pending migrations
    return false;
  }
}

async function generateMigration(): Promise<{ success: boolean; migrationName?: string }> {
  try {
    console.log(`${colors.yellow}📝 Generating migration...${colors.reset}`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const migrationName = `auto_migration_${timestamp}`;
    
    // Generate migration with drizzle-kit
    const { stdout, stderr } = await execAsync(
      `pnpm drizzle-kit generate --name ${migrationName}`
    );
    
    if (stderr && !stderr.includes('warning')) {
      console.error(`${colors.red}Error generating migration: ${stderr}${colors.reset}`);
      return { success: false };
    }
    
    console.log(`${colors.green}✅ Migration generated: ${migrationName}${colors.reset}`);
    if (stdout) console.log(stdout);
    
    return { success: true, migrationName };
  } catch (error: any) {
    console.error(`${colors.red}❌ Failed to generate migration: ${error.message}${colors.reset}`);
    return { success: false };
  }
}

async function main() {
  console.log(`${colors.cyan}🔍 Checking for database schema changes...${colors.reset}\n`);
  
  try {
    // Check if Drizzle is configured
    if (!(await fileExists(DRIZZLE_CONFIG))) {
      console.log(`${colors.yellow}⚠️  No drizzle.config.ts found. Skipping migration check.${colors.reset}`);
      return;
    }
    
    // Get current schema hash
    const currentHash = await getSchemaHash();
    const lastHash = await getLastMigrationHash();
    
    // Check for pending migrations first
    const hasPending = await checkForPendingMigrations();
    if (hasPending) {
      console.log(`${colors.yellow}⚠️  Warning: You have pending migrations that haven't been applied.${colors.reset}`);
      console.log(`   Run 'pnpm drizzle-kit migrate' to apply them.\n`);
    }
    
    // Compare hashes
    if (currentHash === lastHash) {
      console.log(`${colors.green}✅ No schema changes detected.${colors.reset}`);
      return;
    }
    
    if (!lastHash) {
      console.log(`${colors.blue}ℹ️  First time running migration check.${colors.reset}`);
    } else {
      console.log(`${colors.yellow}🔄 Schema changes detected!${colors.reset}`);
    }
    
    // Generate migration
    const result = await generateMigration();
    
    if (result.success) {
      // Save the new hash
      await saveSchemaHash(currentHash);
      
      // Stage the new migration files
      await execAsync(`git add ${MIGRATIONS_DIR}/*`);
      
      console.log(`\n${colors.green}✅ Migration files have been generated and staged.${colors.reset}`);
      console.log(`${colors.cyan}ℹ️  Remember to apply migrations in development:${colors.reset}`);
      console.log(`   pnpm drizzle-kit migrate\n`);
    } else {
      console.log(`\n${colors.red}❌ Failed to generate migration.${colors.reset}`);
      console.log(`   Please run 'pnpm drizzle-kit generate' manually.\n`);
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error(`${colors.red}❌ Error checking migrations: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);