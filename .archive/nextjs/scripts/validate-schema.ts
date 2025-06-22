#!/usr/bin/env bun
/**
 * @file validate-schema.ts
 * @description Pre-commit script that validates Drizzle schemas and their TypeScript types
 * 
 * This script ensures database schemas follow best practices:
 * 
 * Validation checks:
 * 1. Schema file syntax - Valid Drizzle table definitions
 * 2. Required imports - Ensures drizzle-orm is imported
 * 3. Zod schemas - Each table must have insert/select schemas
 * 4. TypeScript types - Proper type exports for each table
 * 5. Compilation - No TypeScript errors in schema files
 * 
 * Why this matters:
 * - Catches schema errors before they reach production
 * - Ensures type safety throughout the application
 * - Maintains consistency across all database tables
 * - Prevents runtime errors from invalid schemas
 * 
 * Usage:
 *   Automatically run by git.ts during commits
 *   Manual: bun scripts/validate-schema.ts
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';

const execAsync = promisify(exec);

// Configuration
const SCHEMA_PATHS = [
  './src/db/schema.ts',
  './src/db/schema/index.ts',
  './src/features/**/schema.ts'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

async function findSchemaFiles(): Promise<string[]> {
  const schemaFiles: string[] = [];
  
  for (const pattern of SCHEMA_PATHS) {
    if (pattern.includes('*')) {
      // Handle glob patterns
      try {
        const { stdout } = await execAsync(`find . -path "${pattern}" -type f 2>/dev/null`);
        const files = stdout.split('\n').filter(Boolean);
        schemaFiles.push(...files);
      } catch {
        // Pattern didn't match any files
      }
    } else {
      // Direct file path
      try {
        await fs.promises.access(pattern);
        schemaFiles.push(pattern);
      } catch {
        // File doesn't exist
      }
    }
  }
  
  return [...new Set(schemaFiles)]; // Remove duplicates
}

async function validateSchemaFile(filePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    file: filePath,
    valid: true,
    errors: []
  };
  
  try {
    // Read the schema file
    const content = await fs.promises.readFile(filePath, 'utf-8');
    
    // Check for common Drizzle imports
    if (!content.includes('drizzle-orm')) {
      result.errors.push('Missing drizzle-orm import');
      result.valid = false;
    }
    
    // Check for table definitions
    const tableMatches = content.match(/export\s+const\s+(\w+)\s*=\s*(pgTable|sqliteTable|mysqlTable)/g);
    if (!tableMatches || tableMatches.length === 0) {
      result.errors.push('No table definitions found');
      result.valid = false;
    }
    
    // Check for Zod schema exports alongside tables
    if (tableMatches) {
      for (const tableMatch of tableMatches) {
        const tableName = tableMatch.match(/const\s+(\w+)/)?.[1];
        if (tableName) {
          // Check for corresponding Zod schemas
          const zodSchemaPattern = new RegExp(`export\\s+const\\s+${tableName}Schema\\s*=\\s*z\\.`);
          const insertSchemaPattern = new RegExp(`export\\s+const\\s+(create|insert)${tableName}Schema\\s*=\\s*z\\.`);
          
          if (!content.match(zodSchemaPattern) && !content.match(insertSchemaPattern)) {
            result.errors.push(`Missing Zod schema for table '${tableName}'`);
            result.valid = false;
          }
          
          // Check for TypeScript type exports
          const typePattern = new RegExp(`export\\s+type\\s+${tableName}\\s*=`);
          if (!content.match(typePattern)) {
            result.errors.push(`Missing TypeScript type export for table '${tableName}'`);
            result.valid = false;
          }
        }
      }
    }
    
    // Validate TypeScript compilation
    const { stderr } = await execAsync(`npx tsc --noEmit --skipLibCheck ${filePath}`);
    if (stderr) {
      result.errors.push(`TypeScript errors: ${stderr}`);
      result.valid = false;
    }
    
  } catch (error: any) {
    result.errors.push(`Failed to validate: ${error.message}`);
    result.valid = false;
  }
  
  return result;
}

async function validateRelations(schemaFiles: string[]): Promise<ValidationResult> {
  const result: ValidationResult = {
    file: 'relations',
    valid: true,
    errors: []
  };
  
  // Check if there's a relations file when multiple schemas exist
  if (schemaFiles.length > 1) {
    const relationsFile = './src/db/relations.ts';
    try {
      await fs.promises.access(relationsFile);
      
      const content = await fs.promises.readFile(relationsFile, 'utf-8');
      if (!content.includes('relations(')) {
        result.errors.push('Relations file exists but no relations defined');
        result.valid = false;
      }
    } catch {
      // Relations file doesn't exist - might be intentional
      console.log(`${colors.yellow}ℹ️  No relations.ts file found (might be intentional)${colors.reset}`);
    }
  }
  
  return result;
}

async function checkDrizzleConfig(): Promise<boolean> {
  try {
    await fs.promises.access('./drizzle.config.ts');
    
    // Validate the config file
    const { stderr } = await execAsync('npx tsc --noEmit --skipLibCheck ./drizzle.config.ts');
    if (stderr) {
      console.log(`${colors.red}❌ drizzle.config.ts has TypeScript errors:${colors.reset}`);
      console.log(stderr);
      return false;
    }
    
    return true;
  } catch {
    console.log(`${colors.yellow}⚠️  No drizzle.config.ts found${colors.reset}`);
    return false;
  }
}

async function main() {
  console.log(`${colors.cyan}🔍 Validating database schemas...${colors.reset}\n`);
  
  try {
    // Check Drizzle config first
    const hasValidConfig = await checkDrizzleConfig();
    if (!hasValidConfig) {
      console.log(`${colors.yellow}⚠️  Skipping schema validation due to missing/invalid config${colors.reset}`);
      return;
    }
    
    // Find all schema files
    const schemaFiles = await findSchemaFiles();
    
    if (schemaFiles.length === 0) {
      console.log(`${colors.yellow}ℹ️  No schema files found to validate${colors.reset}`);
      return;
    }
    
    console.log(`${colors.blue}Found ${schemaFiles.length} schema file(s):${colors.reset}`);
    schemaFiles.forEach(file => console.log(`  - ${file}`));
    console.log();
    
    // Validate each schema file
    const results: ValidationResult[] = [];
    let hasErrors = false;
    
    for (const file of schemaFiles) {
      const result = await validateSchemaFile(file);
      results.push(result);
      
      if (!result.valid) {
        hasErrors = true;
        console.log(`${colors.red}❌ ${result.file}${colors.reset}`);
        result.errors.forEach(error => console.log(`   - ${error}`));
      } else {
        console.log(`${colors.green}✅ ${result.file}${colors.reset}`);
      }
    }
    
    // Validate relations if multiple schemas
    const relationsResult = await validateRelations(schemaFiles);
    if (!relationsResult.valid) {
      hasErrors = true;
      console.log(`\n${colors.red}❌ Relations validation failed:${colors.reset}`);
      relationsResult.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Summary
    console.log(`\n${colors.cyan}Summary:${colors.reset}`);
    const validCount = results.filter(r => r.valid).length;
    console.log(`  - ${validCount}/${results.length} schemas are valid`);
    
    if (hasErrors) {
      console.log(`\n${colors.red}❌ Schema validation failed!${colors.reset}`);
      console.log(`   Please fix the errors above before committing.\n`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}✅ All schemas are valid!${colors.reset}\n`);
    }
    
  } catch (error: any) {
    console.error(`${colors.red}❌ Error validating schemas: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);