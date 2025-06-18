#!/usr/bin/env bun
/**
 * @file generate-api-docs.ts
 * @description API Documentation Generator - Creates OpenAPI spec from code
 * 
 * This script automatically generates comprehensive API documentation by:
 * 1. Scanning all API route files
 * 2. Extracting Zod schemas for request/response validation
 * 3. Parsing route metadata and comments
 * 4. Generating OpenAPI 3.0 specification
 * 
 * The generated docs/openapi.json file:
 * - Provides complete API reference
 * - Can be viewed with Swagger UI
 * - Used by AI assistants (Claude) to understand the API
 * - Always stays in sync with actual code
 * 
 * Usage:
 *   Automatically run by git.ts during commits
 *   Manual: bun scripts/generate-api-docs.ts
 * 
 * Output:
 *   docs/openapi.json - OpenAPI 3.0 specification
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, relative, basename, dirname } from 'path';
import { existsSync } from 'fs';

interface RouteInfo {
  method: string;
  path: string;
  fullPath: string;
  description?: string;
  summary?: string;
  tags: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  security?: boolean;
}

interface SchemaInfo {
  name: string;
  schema: any;
}

// Configuration
const config = {
  apiDir: join(process.cwd(), 'api'),
  outputFile: join(process.cwd(), 'api', 'openapi.json'),
  baseApiPath: '/api',
  verbose: process.argv.includes('--verbose')
};

// Enhanced patterns for better extraction
const patterns = {
  // Hono route patterns - matches app.get, app.post, etc. and auth.get, auth.post, etc.
  // Also matches routes variable pattern
  honoRoute: /(?:app|auth|api|routes?)\.(get|post|put|delete|patch|head|options)\s*\(\s*["'`]([^"'`]+)["'`]/gm,

  // Route registration - matches app.route("/api/something", routes)
  routeRegistration: /app\.route\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\w+)\s*\)/gm,

  // Zod schema definitions
  zodSchema: /(?:const|export const)\s+(\w+Schema)\s*=\s*z\.(object|string|number|boolean|array|union|intersection|lazy)\s*\(/gm,

  // JSDoc comments
  jsDoc: /\/\*\*([\s\S]*?)\*\//g,

  // Single line comments before routes
  singleLineComment: /\/\/\s*(.+)\s*\n\s*app\.(get|post|put|delete|patch)/gm,

  // Query parameter extraction - fixed to avoid duplicates
  queryParam: /c\.req\.query\s*\(\s*["'`](\w+)["'`]\s*\)/g,

  // Path parameter extraction
  pathParam: /c\.req\.param\s*\(\s*["'`](\w+)["'`]\s*\)/g,

  // Request body parsing
  requestBody: /(?:await\s+)?c\.req\.json\s*\(\s*\)/g,

  // Response patterns
  jsonResponse: /c\.json\s*\(\s*(.+?)\s*(?:,\s*(\d{3}))?\s*\)/g,

  // Error response patterns
  errorResponse: /return\s+c\.json\s*\(\s*\{[^}]*error[^}]*\}\s*,\s*(\d{3})\s*\)/g,

  // Zod parse for validation
  zodParse: /(\w+Schema)\.parse\s*\(/g,

  // Import statements to track dependencies
  imports: /import\s+(?:\{[^}]+\}|\w+)\s+from\s+["'`]([^"'`]+)["'`]/g
};

/**
 * Extract JSDoc info from comment
 */
function parseJSDoc(comment: string): any {
  const info: any = {};

  // Extract description (first line without @ tag)
  const descMatch = comment.match(/^\s*\*\s*([^@\*].+)/m);
  if (descMatch) info.description = descMatch[1].trim();

  // Extract @description
  const descTagMatch = comment.match(/@description\s+(.+)/);
  if (descTagMatch) info.description = descTagMatch[1].trim();

  // Extract @summary
  const summaryMatch = comment.match(/@summary\s+(.+)/);
  if (summaryMatch) info.summary = summaryMatch[1].trim();

  // Extract @route
  const routeMatch = comment.match(/@route\s+(\w+)\s+(.+)/);
  if (routeMatch) {
    info.method = routeMatch[1].toUpperCase();
    info.path = routeMatch[2].trim();
  }

  // Extract parameters
  const paramMatches = comment.matchAll(/@(?:param|queryParam|pathParam)\s+\{(\w+)\}\s+(\[?)(\w+)\]?\s+-?\s*(.+)/g);
  info.parameters = [];
  for (const match of paramMatches) {
    info.parameters.push({
      type: match[1],
      name: match[3],
      required: !match[2],
      description: match[4].trim()
    });
  }

  // Extract @returns
  const returnsMatch = comment.match(/@returns\s+\{([^}]+)\}\s+(.+)/);
  if (returnsMatch) {
    info.returns = {
      type: returnsMatch[1],
      description: returnsMatch[2].trim()
    };
  }

  // Extract @access
  const accessMatch = comment.match(/@access\s+(.+)/);
  if (accessMatch) {
    info.security = accessMatch[1].toLowerCase() !== 'public';
  }

  return info;
}

/**
 * Scan directory recursively for TypeScript files
 */
async function scanDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...await scanDirectory(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract routes from a file
 */
async function extractRoutesFromFile(filePath: string, routePrefix: string = ''): Promise<RouteInfo[]> {
  const content = await readFile(filePath, 'utf-8');
  const routes: RouteInfo[] = [];
  const relativePath = relative(config.apiDir, filePath);

  // Determine tag from file path
  let tag = 'General';
  if (relativePath.includes('routes/')) {
    const routeName = basename(filePath, '.ts');
    tag = routeName.charAt(0).toUpperCase() + routeName.slice(1);
  }

  // Extract JSDoc comments and map them by position
  const jsdocComments = new Map<number, any>();
  let jsDocMatch;
  while ((jsDocMatch = patterns.jsDoc.exec(content)) !== null) {
    const info = parseJSDoc(jsDocMatch[1]);
    if (info) {
      jsdocComments.set(jsDocMatch.index + jsDocMatch[0].length, info);
    }
  }

  // Extract routes
  let routeMatch;
  while ((routeMatch = patterns.honoRoute.exec(content)) !== null) {
    const method = routeMatch[1].toUpperCase();
    const path = routeMatch[2];
    const routeIndex = routeMatch.index;

    // Skip if path contains unresolved variables
    if (path.includes('${') && !path.includes('/:')) continue;

    // Build the full path - fix double /api issue
    let fullPath: string;
    if (routePrefix) {
      // If we have a route prefix (from app.route), use it
      fullPath = routePrefix + path;
    } else if (path.startsWith('/api')) {
      // If path already has /api, use as-is
      fullPath = path;
    } else if (relativePath === 'index.ts' && (path === '/' || path === '/health')) {
      // Root level routes in index.ts should not get /api prefix
      fullPath = path;
    } else {
      // Otherwise add /api prefix for route files
      fullPath = `${config.baseApiPath}${path}`;
    }

    const route: RouteInfo = {
      method,
      path,
      fullPath,
      tags: [tag],
      security: !path.includes('login') && !fullPath.includes('/auth') && !path.includes('public') && fullPath !== '/' && fullPath !== '/health'
    };

    // Look for JSDoc comment before this route
    let closestJsDoc: any = null;
    let closestDistance = Infinity;
    for (const [pos, info] of jsdocComments) {
      if (pos < routeIndex && routeIndex - pos < closestDistance) {
        closestDistance = routeIndex - pos;
        closestJsDoc = info;
      }
    }

    if (closestJsDoc) {
      Object.assign(route, closestJsDoc);
    }

    // Look for single-line comment immediately before the route
    const beforeRoute = content.substring(Math.max(0, routeIndex - 200), routeIndex);
    const lines = beforeRoute.split('\n');
    const lastNonEmptyLine = lines.reverse().find(line => line.trim() !== '');
    if (lastNonEmptyLine && lastNonEmptyLine.trim().startsWith('//') && !route.description) {
      const comment = lastNonEmptyLine.trim().replace(/^\/\/\s*/, '');
      // Only use the comment if it looks like a route description
      if (!comment.includes('TODO') && !comment.includes('NOTE') && !comment.includes('@')) {
        route.description = comment;
      }
    }

    // Extract parameters from the route implementation
    const routeEndIndex = content.indexOf('})', routeIndex);
    if (routeEndIndex === -1) continue;

    const routeBody = content.substring(routeIndex, routeEndIndex + 2);

    // Extract query parameters - using Set to avoid duplicates
    const queryParams = new Set<string>();

    // Pattern 1: c.req.query("param")
    let queryMatch;
    const queryRegex = new RegExp(patterns.queryParam.source, patterns.queryParam.flags);
    while ((queryMatch = queryRegex.exec(routeBody)) !== null) {
      queryParams.add(queryMatch[1]);
    }

    // Pattern 2: const { param1, param2 } = c.req.query()
    const destructureMatch = routeBody.match(/const\s*\{([^}]+)\}\s*=\s*c\.req\.query\(\)/);
    if (destructureMatch) {
      const params = destructureMatch[1].split(',').map(p => p.trim());
      params.forEach(param => queryParams.add(param));
    }

    // Extract path parameters from the path
    const pathParams = new Set<string>();
    const pathParamMatches = path.matchAll(/:(\w+)/g);
    for (const match of pathParamMatches) {
      pathParams.add(match[1]);
    }

    // Build parameters array
    route.parameters = [];

    // Add path parameters
    for (const param of pathParams) {
      route.parameters.push({
        name: param,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `Path parameter: ${param}`
      });
    }

    // Add query parameters
    for (const param of queryParams) {
      // Skip if already defined in JSDoc
      if (!route.parameters.find(p => p.name === param)) {
        route.parameters.push({
          name: param,
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: `Query parameter: ${param}`
        });
      }
    }

    // Check if route expects JSON body
    if (patterns.requestBody.test(routeBody) && ['POST', 'PUT', 'PATCH'].includes(method)) {
      // Look for Zod schema usage
      const zodMatch = patterns.zodParse.exec(routeBody);
      if (zodMatch) {
        route.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${zodMatch[1]}` }
            }
          }
        };
      } else {
        route.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        };
      }
    }

    // Extract error responses
    const errorResponses = new Map<string, string>();
    let errorMatch;
    while ((errorMatch = patterns.errorResponse.exec(routeBody)) !== null) {
      errorResponses.set(errorMatch[1], 'Error response');
    }

    // Build responses
    route.responses = {
      200: {
        description: route.returns?.description || 'Successful response',
        content: {
          'application/json': {
            schema: route.returns?.type ?
              { $ref: `#/components/schemas/${route.returns.type}` } :
              { type: 'object' }
          }
        }
      }
    };

    // Add error responses
    for (const [code, desc] of errorResponses) {
      route.responses[code] = {
        description: desc,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      };
    }

    // Add default error responses if not present
    if (!route.responses[400]) {
      route.responses[400] = { description: 'Bad Request' };
    }
    if (route.security && !route.responses[401]) {
      route.responses[401] = { description: 'Unauthorized' };
    }
    if (!route.responses[500]) {
      route.responses[500] = { description: 'Internal Server Error' };
    }

    routes.push(route);
  }

  return routes;
}

/**
 * Extract schemas from file
 */
async function extractSchemasFromFile(filePath: string): Promise<SchemaInfo[]> {
  const content = await readFile(filePath, 'utf-8');
  const schemas: SchemaInfo[] = [];

  // Extract Zod schemas
  let schemaMatch;
  while ((schemaMatch = patterns.zodSchema.exec(content)) !== null) {
    const schemaName = schemaMatch[1];
    const schemaType = schemaMatch[2];

    // Try to extract the full schema definition
    const startIndex = schemaMatch.index;
    const openParen = content.indexOf('({', startIndex);
    if (openParen === -1) continue;

    let braceCount = 1;
    let endIndex = openParen + 1;
    let inString = false;
    let stringChar = '';

    // Simple parser to find the end of the schema object
    for (let i = openParen + 2; i < content.length; i++) {
      const char = content[i];
      const prevChar = content[i - 1];

      if (!inString) {
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          inString = true;
          stringChar = char;
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            // Also capture the closing parenthesis
            const closeParenIndex = content.indexOf(')', endIndex);
            if (closeParenIndex !== -1 && closeParenIndex - endIndex < 10) {
              endIndex = closeParenIndex + 1;
            }
            break;
          }
        }
      } else if (char === stringChar && prevChar !== '\\') {
        inString = false;
      }
    }

    const schemaDefinition = content.substring(startIndex, endIndex);

    // Build schema object based on type
    let schema: any = {
      type: schemaType === 'object' ? 'object' :
        schemaType === 'array' ? 'array' :
          schemaType === 'string' ? 'string' :
            schemaType === 'number' ? 'number' :
              schemaType === 'boolean' ? 'boolean' : 'object'
    };

    // Extract properties for object schemas
    if (schemaType === 'object') {
      schema.properties = {};

      // Extract property definitions - improved pattern to capture chained methods
      const propPattern = /(\w+):\s*z\.(string|number|boolean|date|uuid|email|url|array|object)(?:\(\))?([^,\n}]*)/g;
      let propMatch;
      while ((propMatch = propPattern.exec(schemaDefinition)) !== null) {
        const propName = propMatch[1];
        const propType = propMatch[2];
        const modifiers = propMatch[3] || '';

        // Check if it's optional
        const isOptional = modifiers.includes('.optional()');
        const hasDefault = modifiers.includes('.default(');

        schema.properties[propName] = {
          type: propType === 'date' ? 'string' :
            propType === 'uuid' ? 'string' :
              propType === 'email' ? 'string' :
                propType === 'url' ? 'string' :
                  propType
        };

        if (propType === 'date') {
          schema.properties[propName].format = 'date-time';
        } else if (propType === 'uuid') {
          schema.properties[propName].format = 'uuid';
        } else if (propType === 'email') {
          schema.properties[propName].format = 'email';
        } else if (propType === 'url') {
          schema.properties[propName].format = 'uri';
        }

        // Only add to required if not optional and no default value
        if (!isOptional && !hasDefault) {
          if (!schema.required) schema.required = [];
          schema.required.push(propName);
        }
      }
    }

    schemas.push({
      name: schemaName,
      schema
    });
  }

  return schemas;
}

/**
 * Process the main index.ts file to get route registrations
 */
async function processMainIndex(): Promise<Map<string, string>> {
  const routePrefixes = new Map<string, string>();
  const indexPath = join(config.apiDir, 'index.ts');

  try {
    const content = await readFile(indexPath, 'utf-8');

    // Find route registrations
    let match;
    while ((match = patterns.routeRegistration.exec(content)) !== null) {
      const prefix = match[1];
      const routeVar = match[2];
      routePrefixes.set(routeVar, prefix);
    }
  } catch (error) {
    console.warn('Could not process main index.ts:', error.message);
  }

  return routePrefixes;
}

/**
 * Generate OpenAPI documentation
 */
async function generateDocs() {
  console.log('🚀 Starting Conkero API Documentation Generator\n');

  // Initialize OpenAPI document
  const openApiDoc: any = {
    openapi: '3.0.0',
    info: {
      title: 'Conkero API',
      version: '1.0.0',
      description: 'Amazon Seller Automation Platform API',
      contact: {
        name: 'Conkero Support',
        email: 'support@conkero.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server'
      },
      {
        url: 'https://api.conkero.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            message: {
              type: 'string'
            }
          }
        }
      }
    },
    paths: {},
    tags: []
  };

  // Get route prefixes from main index
  const routePrefixes = await processMainIndex();

  // Scan for all TypeScript files
  const files = await scanDirectory(config.apiDir);
  console.log(`📁 Found ${files.length} TypeScript files\n`);

  const allRoutes: RouteInfo[] = [];
  const allSchemas: SchemaInfo[] = [];
  const allTags = new Set<string>();

  // Process each file
  for (const file of files) {
    const relativePath = relative(config.apiDir, file);

    // Skip index.ts here as we process it separately
    if (basename(file) === 'index.ts') {
      continue;
    }

    if (config.verbose) {
      console.log(`📄 Processing: ${relativePath}`);
    }

    try {
      // Determine route prefix based on file location
      let routePrefix = '';
      const fileName = basename(file, '.ts');

      // Check if this is a route file registered in index.ts
      if (relativePath.includes('routes/')) {
        // For route files, check if they're registered with a prefix
        for (const [varName, prefix] of routePrefixes) {
          // Match based on the route filename
          if (fileName === varName.replace('Routes', '') ||
            varName.toLowerCase().includes(fileName.toLowerCase())) {
            routePrefix = prefix;
            break;
          }
        }
      }

      // Extract routes and schemas
      const routes = await extractRoutesFromFile(file, routePrefix);
      const schemas = await extractSchemasFromFile(file);

      allRoutes.push(...routes);
      allSchemas.push(...schemas);

      // Collect tags
      routes.forEach(route => {
        route.tags.forEach(tag => allTags.add(tag));
      });

      if (config.verbose && routes.length > 0) {
        console.log(`  ✓ Found ${routes.length} routes`);
      }
      if (config.verbose && schemas.length > 0) {
        console.log(`  ✓ Found ${schemas.length} schemas`);
      }
    } catch (error) {
      console.warn(`⚠️  Error processing ${relativePath}:`, error.message);
    }
  }

  // Process index.ts separately to extract its routes
  try {
    const indexPath = join(config.apiDir, 'index.ts');
    const indexRoutes = await extractRoutesFromFile(indexPath, '');

    // Add tags from index routes
    indexRoutes.forEach(route => {
      // Determine appropriate tag based on path
      if (route.fullPath.includes('/settings')) {
        route.tags = ['Settings'];
        allTags.add('Settings');
      } else if (route.tags.length === 0 || route.tags[0] === 'General') {
        route.tags = ['General'];
      }
      route.tags.forEach(tag => allTags.add(tag));
    });

    allRoutes.push(...indexRoutes);

    if (config.verbose && indexRoutes.length > 0) {
      console.log(`📄 Processing: index.ts (main routes)`);
      console.log(`  ✓ Found ${indexRoutes.length} routes`);
    }
  } catch (error) {
    console.warn('⚠️  Error processing index.ts:', error.message);
  }

  // Add schemas to OpenAPI document
  for (const { name, schema } of allSchemas) {
    openApiDoc.components.schemas[name] = schema;
  }

  // Add SP API credentials schema if not already present
  if (!openApiDoc.components.schemas.SpApiCredentials) {
    openApiDoc.components.schemas.SpApiCredentials = {
      type: 'object',
      required: ['sellerId', 'marketplaceId', 'refreshToken', 'clientId', 'clientSecret', 'region'],
      properties: {
        sellerId: { type: 'string' },
        marketplaceId: { type: 'string' },
        refreshToken: { type: 'string' },
        clientId: { type: 'string' },
        clientSecret: { type: 'string' },
        region: { type: 'string', enum: ['na', 'eu', 'fe'] }
      }
    };
  }

  // Add routes to OpenAPI document
  for (const route of allRoutes) {
    const path = route.fullPath;
    if (!openApiDoc.paths[path]) {
      openApiDoc.paths[path] = {};
    }

    const operation: any = {
      tags: route.tags,
      summary: route.summary || route.description || `${route.method} ${route.path}`,
      description: route.description
    };

    if (route.parameters && route.parameters.length > 0) {
      operation.parameters = route.parameters;
    }

    if (route.requestBody) {
      operation.requestBody = route.requestBody;
    }

    operation.responses = route.responses;

    if (route.security) {
      operation.security = [{ bearerAuth: [] }];
    }

    openApiDoc.paths[path][route.method.toLowerCase()] = operation;
  }

  // Add tags to document
  openApiDoc.tags = Array.from(allTags).map(tag => ({
    name: tag,
    description: `${tag} endpoints`
  }));

  // Ensure docs directory exists
  const docsDir = dirname(config.outputFile);
  if (!existsSync(docsDir)) {
    await mkdir(docsDir, { recursive: true });
  }

  // Write the documentation
  await writeFile(config.outputFile, JSON.stringify(openApiDoc, null, 2));

  // Summary
  console.log('\n✅ API Documentation Generated Successfully!\n');
  console.log(`📊 Summary:`);
  console.log(`   - Total endpoints: ${allRoutes.length}`);
  console.log(`   - Total schemas: ${Object.keys(openApiDoc.components.schemas).length}`);
  console.log(`   - Tags: ${Array.from(allTags).join(', ')}`);
  console.log(`   - Output: ${config.outputFile}\n`);

  console.log('🔍 View your documentation:');
  console.log('   1. Swagger UI: https://editor.swagger.io/');
  console.log('   2. ReDoc: https://redocly.github.io/redoc/');
  console.log('   3. Import into Postman as OpenAPI 3.0\n');

  if (!config.verbose) {
    console.log('💡 Tip: Run with --verbose flag for detailed output\n');
  }
}

// Run the generator
generateDocs().catch(error => {
  console.error('❌ Failed to generate documentation:', error);
  process.exit(1);
});
