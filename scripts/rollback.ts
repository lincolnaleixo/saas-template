#!/usr/bin/env bun
/**
 * @file rollback.ts
 * @description Database migration rollback tool
 *              Rolls back migrations using manual rollback scripts
 *              Always creates a backup before rollback
 * 
 * Usage:
 *   bun run scripts/rollback.ts                    - Rollback last migration
 *   bun run scripts/rollback.ts 0002_add_roles.sql - Rollback specific migration
 *   bun run scripts/rollback.ts --list             - List applied migrations
 * 
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string
 * 
 * Note: Rollback scripts must be manually created in migrations/rollback/
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
const shouldList = args.includes('--list');
const targetVersion = args.find(arg => !arg.startsWith('--'));

// Environment configuration
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Initialize database connection
const sql = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(sql);

/**
 * List all applied migrations
 */
async function listMigrations(): Promise<void> {
  try {
    const migrations = await sql`
      SELECT version, created_at 
      FROM __drizzle_migrations 
      ORDER BY created_at DESC
    `;
    
    if (migrations.length === 0) {
      console.log('No migrations have been applied');
      return;
    }
    
    console.log('\n📋 Applied migrations:');
    console.log('━'.repeat(60));
    
    migrations.forEach((m, index) => {
      const date = new Date(m.created_at).toLocaleString();
      const current = index === 0 ? ' (current)' : '';
      console.log(`${m.version} - ${date}${current}`);
    });
  } catch (error) {
    console.error('❌ Failed to list migrations:', error.message);
  }
}

/**
 * Get the last applied migration
 */
async function getLastMigration(): Promise<string | null> {
  try {
    const result = await sql`
      SELECT version 
      FROM __drizzle_migrations 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    return result[0]?.version || null;
  } catch (error) {
    return null;
  }
}

/**
 * Create database backup
 */
async function createBackup(): Promise<boolean> {
  console.log('💾 Creating database backup before rollback...');
  
  try {
    const backupScripts = [
      './scripts/backup-sql.sh',
      './dev/backup-sql.sh',
      './backup-sql.sh'
    ];
    
    for (const script of backupScripts) {
      try {
        if (await fs.access(script).then(() => true).catch(() => false)) {
          execSync(`bash ${script}`, { stdio: 'inherit' });
          console.log('✅ Backup completed successfully');
          return true;
        }
      } catch (error) {
        // Try next script
      }
    }
    
    console.warn('⚠️  No backup script found');
    return false;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    return false;
  }
}

/**
 * Perform rollback
 */
async function rollbackMigration(version: string): Promise<void> {
  const rollbackFile = path.join('./migrations/rollback', version);
  
  // Check if rollback script exists
  try {
    await fs.access(rollbackFile);
  } catch (error) {
    console.error(`❌ No rollback script found: ${rollbackFile}`);
    console.error('\n💡 To create a rollback script:');
    console.error(`   1. Copy the original migration to ${rollbackFile}`);
    console.error('   2. Edit it to reverse the changes');
    console.error('   3. Test thoroughly before using in production');
    throw new Error('Rollback script not found');
  }
  
  // Read rollback SQL
  const rollbackSQL = await fs.readFile(rollbackFile, 'utf-8');
  
  console.log(`\n📄 Executing rollback for: ${version}`);
  console.log('━'.repeat(50));
  
  // Execute rollback in transaction
  await sql.begin(async (tx) => {
    // Execute rollback SQL
    await tx.unsafe(rollbackSQL);
    
    // Remove from migrations table
    await tx`
      DELETE FROM __drizzle_migrations 
      WHERE version = ${version}
    `;
  });
  
  console.log('✅ Rollback completed successfully');
}

/**
 * Main rollback runner
 */
async function runRollback(): Promise<void> {
  console.log('🔄 Database Rollback Tool');
  console.log('━'.repeat(50));
  
  try {
    // Handle --list flag
    if (shouldList) {
      await listMigrations();
      await sql.end();
      process.exit(0);
    }
    
    // Determine which migration to rollback
    let versionToRollback = targetVersion;
    
    if (!versionToRollback) {
      // Get last applied migration
      versionToRollback = await getLastMigration();
      
      if (!versionToRollback) {
        console.log('No migrations to rollback');
        await sql.end();
        process.exit(0);
      }
      
      console.log(`\n🎯 Target: ${versionToRollback} (last applied)`);
    } else {
      console.log(`\n🎯 Target: ${versionToRollback}`);
      
      // Verify migration exists
      const exists = await sql`
        SELECT 1 FROM __drizzle_migrations 
        WHERE version = ${versionToRollback}
      `;
      
      if (exists.length === 0) {
        console.error(`❌ Migration ${versionToRollback} not found in database`);
        await listMigrations();
        await sql.end();
        process.exit(1);
      }
    }
    
    // Confirm rollback
    console.log('\n⚠️  WARNING: This will rollback database changes');
    console.log('   Make sure you have tested the rollback script!\n');
    
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>(resolve => {
      rl.question('Continue with rollback? (yes/no): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('Rollback cancelled');
      await sql.end();
      process.exit(0);
    }
    
    // Create backup
    const backupSuccess = await createBackup();
    if (!backupSuccess) {
      console.error('\n⚠️  Proceeding without backup - this is risky!');
      
      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer2 = await new Promise<string>(resolve => {
        rl2.question('Continue anyway? (yes/no): ', resolve);
      });
      rl2.close();
      
      if (answer2.toLowerCase() !== 'yes') {
        console.log('Rollback cancelled');
        await sql.end();
        process.exit(0);
      }
    }
    
    // Perform rollback
    await rollbackMigration(versionToRollback);
    
    // Show current state
    console.log('\n' + '━'.repeat(50));
    await listMigrations();
    
    console.log('\n💡 Next steps:');
    console.log('   1. Test your application thoroughly');
    console.log('   2. Update your code to match the rolled-back schema');
    console.log('   3. Delete or fix the problematic migration file');
    
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    console.error('\n💡 Recovery options:');
    console.error('   1. Restore from the backup created before rollback');
    console.error('   2. Manually fix the database state');
    console.error('   3. Re-run migrations to return to previous state');
    
    await sql.end();
    process.exit(1);
  }
  
  await sql.end();
}

// Execute rollback
runRollback();