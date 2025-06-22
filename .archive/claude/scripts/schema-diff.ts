#!/usr/bin/env bun
/**
 * @file schema-diff.ts
 * @description Compare database schemas between environments
 *              Useful for verifying production matches development
 * 
 * Usage:
 *   bun run scripts/schema-diff.ts                    - Compare dev vs prod
 *   bun run scripts/schema-diff.ts --from=dev --to=staging
 * 
 * Environment:
 *   DATABASE_URL - Development database (default)
 *   PRODUCTION_DATABASE_URL - Production database
 *   STAGING_DATABASE_URL - Staging database
 */

import postgres from 'postgres';
import { createHash } from 'crypto';

// Parse command line arguments
const args = process.argv.slice(2);
const fromEnv = args.find(arg => arg.startsWith('--from='))?.split('=')[1] || 'dev';
const toEnv = args.find(arg => arg.startsWith('--to='))?.split('=')[1] || 'prod';

// Database URLs from environment
const dbUrls = {
  dev: process.env.DATABASE_URL,
  prod: process.env.PRODUCTION_DATABASE_URL,
  staging: process.env.STAGING_DATABASE_URL,
};

if (!dbUrls[fromEnv] || !dbUrls[toEnv]) {
  console.error(`❌ Missing database URL for ${fromEnv} or ${toEnv}`);
  console.error('Required environment variables:');
  console.error('  DATABASE_URL (dev)');
  console.error('  PRODUCTION_DATABASE_URL (prod)');
  console.error('  STAGING_DATABASE_URL (staging)');
  process.exit(1);
}

// Initialize connections
const fromDb = postgres(dbUrls[fromEnv], { max: 1 });
const toDb = postgres(dbUrls[toEnv], { max: 1 });

/**
 * Get database schema information
 */
async function getSchemaInfo(db: any): Promise<any> {
  // Get all tables
  const tables = await db`
    SELECT 
      table_name,
      table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type IN ('BASE TABLE', 'VIEW')
    ORDER BY table_name
  `;
  
  // Get all columns
  const columns = await db`
    SELECT 
      table_name,
      column_name,
      data_type,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;
  
  // Get all constraints
  const constraints = await db`
    SELECT 
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `;
  
  // Get all indexes
  const indexes = await db`
    SELECT 
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;
  
  // Get migration status
  let migrations = [];
  try {
    migrations = await db`
      SELECT version, created_at 
      FROM __drizzle_migrations 
      ORDER BY created_at
    `;
  } catch (e) {
    // Migrations table might not exist
  }
  
  return {
    tables: new Set(tables.map(t => t.table_name)),
    columns,
    constraints,
    indexes,
    migrations,
  };
}

/**
 * Compare two schemas and report differences
 */
function compareSchemas(fromSchema: any, toSchema: any): void {
  let hasDifferences = false;
  
  // Compare tables
  const fromTables = fromSchema.tables;
  const toTables = toSchema.tables;
  
  const missingTables = [...fromTables].filter(t => !toTables.has(t));
  const extraTables = [...toTables].filter(t => !fromTables.has(t));
  
  if (missingTables.length > 0) {
    console.log('\n❌ Missing tables in target:');
    missingTables.forEach(t => console.log(`   - ${t}`));
    hasDifferences = true;
  }
  
  if (extraTables.length > 0) {
    console.log('\n⚠️  Extra tables in target:');
    extraTables.forEach(t => console.log(`   - ${t}`));
    hasDifferences = true;
  }
  
  // Compare columns
  const fromColumns = new Map();
  const toColumns = new Map();
  
  fromSchema.columns.forEach(col => {
    const key = `${col.table_name}.${col.column_name}`;
    fromColumns.set(key, col);
  });
  
  toSchema.columns.forEach(col => {
    const key = `${col.table_name}.${col.column_name}`;
    toColumns.set(key, col);
  });
  
  const columnDiffs = [];
  
  // Check missing columns
  fromColumns.forEach((col, key) => {
    if (!toColumns.has(key)) {
      columnDiffs.push(`❌ Missing column: ${key}`);
    } else {
      // Compare column properties
      const toCol = toColumns.get(key);
      const diffs = [];
      
      if (col.data_type !== toCol.data_type) {
        diffs.push(`type: ${col.data_type} → ${toCol.data_type}`);
      }
      if (col.is_nullable !== toCol.is_nullable) {
        diffs.push(`nullable: ${col.is_nullable} → ${toCol.is_nullable}`);
      }
      if (col.column_default !== toCol.column_default) {
        diffs.push(`default: ${col.column_default} → ${toCol.column_default}`);
      }
      
      if (diffs.length > 0) {
        columnDiffs.push(`⚠️  Changed column ${key}: ${diffs.join(', ')}`);
      }
    }
  });
  
  // Check extra columns
  toColumns.forEach((col, key) => {
    if (!fromColumns.has(key)) {
      columnDiffs.push(`➕ Extra column: ${key}`);
    }
  });
  
  if (columnDiffs.length > 0) {
    console.log('\n📋 Column differences:');
    columnDiffs.forEach(diff => console.log(`   ${diff}`));
    hasDifferences = true;
  }
  
  // Compare migrations
  const fromMigrations = new Set(fromSchema.migrations.map(m => m.version));
  const toMigrations = new Set(toSchema.migrations.map(m => m.version));
  
  const missingMigrations = [...fromMigrations].filter(m => !toMigrations.has(m));
  const extraMigrations = [...toMigrations].filter(m => !fromMigrations.has(m));
  
  if (missingMigrations.length > 0) {
    console.log('\n❌ Missing migrations in target:');
    missingMigrations.forEach(m => console.log(`   - ${m}`));
    hasDifferences = true;
  }
  
  if (extraMigrations.length > 0) {
    console.log('\n⚠️  Extra migrations in target:');
    extraMigrations.forEach(m => console.log(`   - ${m}`));
    hasDifferences = true;
  }
  
  // Summary
  if (!hasDifferences) {
    console.log('\n✅ Schemas are identical!');
  } else {
    console.log('\n⚠️  Schemas have differences');
    console.log('\n💡 To synchronize:');
    console.log('   1. Review the differences above');
    console.log('   2. Run pending migrations on target');
    console.log('   3. Or restore target from source backup');
  }
}

/**
 * Generate schema hash for comparison
 */
function generateSchemaHash(schema: any): string {
  const data = {
    tables: [...schema.tables].sort(),
    columns: schema.columns.map(c => ({
      table: c.table_name,
      column: c.column_name,
      type: c.data_type,
      nullable: c.is_nullable,
    })).sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`)),
  };
  
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * Main comparison runner
 */
async function runComparison(): Promise<void> {
  console.log(`🔍 Schema Comparison Tool`);
  console.log(`📊 Comparing: ${fromEnv} → ${toEnv}`);
  console.log('━'.repeat(50));
  
  try {
    console.log(`\n📖 Reading ${fromEnv} schema...`);
    const fromSchema = await getSchemaInfo(fromDb);
    const fromHash = generateSchemaHash(fromSchema);
    
    console.log(`📖 Reading ${toEnv} schema...`);
    const toSchema = await getSchemaInfo(toDb);
    const toHash = generateSchemaHash(toSchema);
    
    console.log(`\n🔑 Schema hashes:`);
    console.log(`   ${fromEnv}: ${fromHash.substring(0, 8)}`);
    console.log(`   ${toEnv}: ${toHash.substring(0, 8)}`);
    
    if (fromHash === toHash) {
      console.log('\n✅ Schemas are identical!');
    } else {
      console.log('\n⚠️  Schemas differ, analyzing...');
      compareSchemas(fromSchema, toSchema);
    }
    
  } catch (error) {
    console.error('\n❌ Comparison failed:', error);
    console.error('\n💡 Check that both databases are accessible');
  } finally {
    await fromDb.end();
    await toDb.end();
  }
}

// Execute comparison
runComparison();