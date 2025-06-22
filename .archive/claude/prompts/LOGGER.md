# Logger Documentation

This project includes a custom, lightweight logging library designed for both backend and frontend use. The logger provides a consistent API across environments while adapting to platform-specific capabilities.

## IMPORTANT: Mandatory Logger Usage

**ALL console.log, console.error, console.warn, and console.debug statements MUST be replaced with the appropriate logger methods.** This is a strict requirement for all code in this project to ensure:
- Consistent logging format across the codebase
- Proper log persistence in files and localStorage
- Better debugging capabilities with contextual information
- Centralized log management and monitoring

### Migration Requirements
- ❌ NEVER use `console.log()`, `console.error()`, `console.warn()`, or `console.debug()`
- ✅ ALWAYS use `logger.info()`, `logger.error()`, `logger.warn()`, or `logger.debug()`
- ✅ ALWAYS import and use the logger in every module that needs logging
- ✅ ALWAYS include relevant context when logging

### Initial Setup
1. Ensure the `./logger` directory exists (it will be created automatically)
2. Set `LOG_TO_FILE=true` in your `.env` file
3. Logs will be saved as `./logger/app-YYYY-MM-DD.log`
4. All logs will also appear in the terminal with colors and formatting

## Features

- **Unified API**: Same logging interface for both backend and frontend
- **Multiple Log Levels**: ERROR, WARN, INFO, DEBUG
- **Multiple Transports**: Console, File (backend), localStorage (frontend), Remote (frontend)
- **Contextual Logging**: Add metadata to log entries
- **Child Loggers**: Create scoped loggers with inherited context
- **Configurable**: Environment-based configuration
- **Type-Safe**: Full TypeScript support
- **Performant**: Asynchronous transports, batching for remote logs
- **Pretty Formatting**: Colored output with emojis in development

## Quick Start

### Backend Usage

```typescript
import { logger, createLogger } from '@/backend/lib/logger';

// IMPORTANT: With LOG_TO_FILE=true, all logs appear in:
// - Terminal (with colors and emojis)
// - ./logger/app-YYYY-MM-DD.log files

// Use the default logger
logger.info('Application started'); // Shows in terminal + saved to file
logger.error('Something went wrong', { userId: 123 }); // Red in terminal + file

// Create a scoped logger
const authLogger = createLogger({ 
  source: 'auth',
  context: { module: 'authentication' }
});

authLogger.info('User logged in', { userId: 456 });

// Create child logger with additional context
const sessionLogger = authLogger.child({ sessionId: 'abc123' });
sessionLogger.debug('Session created');

// Log errors with stack traces
try {
  someRiskyOperation();
} catch (error) {
  logger.error('Operation failed', error); // Full stack trace in both outputs
}
```

### Frontend Usage

```typescript
import { logger, createLogger, getStoredLogs, clearStoredLogs } from '@/frontend/lib/logger';

// Use the default logger
logger.info('Page loaded');
logger.warn('Slow network detected', { latency: 2000 });

// Create component-specific logger
const componentLogger = createLogger({
  source: 'UserProfile',
  context: { component: 'UserProfile' }
});

componentLogger.debug('Component rendered', { props: { userId: 123 } });

// Access stored logs from localStorage
const recentLogs = getStoredLogs();
console.log('Recent logs:', recentLogs);

// Clear stored logs
clearStoredLogs();

// Set log level dynamically (persisted in localStorage)
import { loggerFactory } from '@/frontend/lib/logger';
loggerFactory.setLogLevel('debug');
```

## Configuration

### Environment Variables (Backend)

```bash
# Log Level (error, warn, info, debug)
LOG_LEVEL=info

# File Logging - RECOMMENDED TO ENABLE IN ALL ENVIRONMENTS
LOG_TO_FILE=true                     # Enable file logging (SHOULD BE true)
LOG_DIR=./logger                     # Directory for log files (uses ./logger folder)
LOG_MAX_SIZE=10485760               # Max log file size in bytes (10MB)
LOG_MAX_FILES=5                     # Number of log files to keep

# Console Output - ALWAYS ENABLED
LOG_EMOJIS=true                     # Enable emojis in console logs (dev)
LOG_COLORS=true                     # Enable colors in console logs
```

### Recommended Backend Configuration

For consistent logging across all environments, use these settings:

```bash
# .env or .env.local
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_DIR=./logger
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=10
LOG_EMOJIS=true
LOG_COLORS=true
```

This ensures:
- All logs are written to files in the `./logger` directory
- Logs are displayed in the terminal with colors and formatting
- Log files are automatically rotated when they reach 10MB
- The last 10 log files are retained for debugging

### Frontend Configuration

```typescript
// Configure the logger factory (usually in main.ts)
import { LoggerFactory } from '@/frontend/lib/logger';

const factory = new LoggerFactory({
  enableLocalStorage: true,          // Store logs in localStorage
  enableRemote: true,                // Send logs to remote endpoint
  remoteEndpoint: '/api/logs',       // Remote logging endpoint
  remoteApiKey: 'your-api-key',     // API key for authentication
  logLevel: 'info',                  // Default log level
});
```

### URL-based Debugging (Frontend)

Add `?log_level=debug` to any URL to temporarily enable debug logging:
```
https://yourapp.com/dashboard?log_level=debug
```

## Log Levels

| Level | Value | Description | Use Case |
|-------|-------|-------------|----------|
| ERROR | 0 | Critical errors | Unrecoverable errors, exceptions |
| WARN  | 1 | Warnings | Degraded functionality, deprecations |
| INFO  | 2 | Information | Normal operations, state changes |
| DEBUG | 3 | Debug info | Detailed debugging information |

## Transports

### Backend Transports

1. **Console Transport** (ALWAYS ENABLED)
   - Pretty formatted with colors and emojis in development
   - JSON formatted in production
   - Outputs to stdout/stderr for terminal visibility
   - Real-time log monitoring in terminal

2. **File Transport** (SHOULD BE ENABLED)
   - Writes to `./logger` directory by default
   - Rotating log files with date patterns (e.g., `app-2024-01-15.log`)
   - Automatic size-based rotation when files reach configured size
   - Configurable retention policy (keeps last N files)
   - Asynchronous writes with queuing for performance
   - Creates logger directory automatically if it doesn't exist

### Frontend Transports

1. **Console Transport**
   - Browser-optimized formatting with CSS styles
   - Collapsed context objects
   - Proper error stack traces

2. **LocalStorage Transport**
   - Stores recent logs in browser localStorage
   - Configurable maximum entries
   - Survives page reloads
   - Useful for debugging user issues

3. **Remote Transport**
   - Batches logs for efficient network usage
   - Automatic retry on failure
   - Filters by minimum log level
   - Uses sendBeacon on page unload

## Advanced Usage

### Custom Context

```typescript
// Backend example with request context
app.use((req, res, next) => {
  req.logger = logger.child({
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// In route handler
app.get('/users/:id', (req, res) => {
  req.logger.info('Fetching user', { userId: req.params.id });
  // All logs will include request context
});
```

### Performance Logging

```typescript
// Log performance metrics
const startTime = performance.now();

// Do some work...

logger.info('Operation completed', {
  duration: performance.now() - startTime,
  operation: 'fetchUserData',
  success: true,
});
```

### Structured Logging

```typescript
// Log structured data for better analysis
logger.info('Order processed', {
  orderId: order.id,
  userId: user.id,
  amount: order.total,
  items: order.items.length,
  paymentMethod: order.payment.method,
  processingTime: Date.now() - startTime,
  tags: ['order', 'payment', 'success'],
});
```

### Error Boundaries (Frontend)

```typescript
// React error boundary example
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React error boundary triggered', {
      error,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
    });
  }
}
```

### Monitoring Integration

```typescript
// Send critical errors to monitoring service
const monitoringLogger = createLogger({
  source: 'monitoring',
});

// Intercept errors
monitoringLogger.child = function(context) {
  const child = CoreLogger.prototype.child.call(this, context);
  const originalError = child.error;
  
  child.error = function(message, context) {
    originalError.call(this, message, context);
    
    // Send to monitoring service
    if (window.Sentry) {
      Sentry.captureMessage(message, 'error');
    }
  };
  
  return child;
};
```

## Terminal Output

The logger provides rich terminal output with the following features:

### Backend Terminal Output
- **Colored Output**: Different colors for each log level (red for errors, yellow for warnings, etc.)
- **Emojis**: Visual indicators for log levels (🚨 ERROR, ⚠️ WARN, ℹ️ INFO, 🐛 DEBUG)
- **Timestamps**: ISO format timestamps for each log entry
- **Source Identification**: Shows which module/component generated the log
- **Structured Context**: Pretty-printed JSON for context objects
- **Stack Traces**: Full error stack traces for debugging

### Viewing Logs in Terminal

```bash
# Real-time log monitoring
tail -f ./logger/app-*.log

# View today's logs with colors
cat ./logger/app-$(date +%Y-%m-%d).log

# Filter by log level
grep "ERROR" ./logger/app-*.log
grep "WARN" ./logger/app-*.log

# Search for specific context
grep "userId: 123" ./logger/app-*.log

# Monitor specific module logs
tail -f ./logger/app-*.log | grep "auth"
```

## Best Practices

1. **Use Appropriate Log Levels**
   - ERROR: Only for actual errors that need attention
   - WARN: For concerning but handled situations
   - INFO: For significant application events
   - DEBUG: For detailed debugging (not in production)

2. **Include Relevant Context**
   ```typescript
   // Good - includes context
   logger.info('User login successful', { 
     userId: user.id, 
     email: user.email,
     loginMethod: 'oauth' 
   });
   
   // Bad - no context
   logger.info('User logged in');
   ```

3. **Use Child Loggers for Modules**
   ```typescript
   // Create module-specific loggers
   const dbLogger = createLogger({ source: 'database' });
   const apiLogger = createLogger({ source: 'api' });
   const authLogger = createLogger({ source: 'auth' });
   ```

4. **Don't Log Sensitive Data**
   ```typescript
   // Bad - logs password
   logger.info('Login attempt', { email, password });
   
   // Good - excludes sensitive data
   logger.info('Login attempt', { email });
   ```

5. **Use Structured Logging**
   ```typescript
   // Structured data is easier to query and analyze
   logger.info('API request completed', {
     method: 'GET',
     path: '/api/users',
     statusCode: 200,
     responseTime: 45,
     userId: req.user?.id,
   });
   ```

## Troubleshooting

### Logs Not Appearing

1. Check log level configuration
2. Verify environment variables are loaded
3. Check if console methods are being overridden
4. For file logs, check write permissions

### Performance Issues

1. Reduce log level in production (ERROR or WARN)
2. Disable file transport if not needed
3. Increase remote transport batch size
4. Use child loggers to avoid recreating context

### Storage Issues (Frontend)

1. localStorage may be full or disabled
2. Clear old logs with `clearStoredLogs()`
3. Reduce `maxEntries` in LocalStorageTransport
4. Disable localStorage transport if not needed

## Migration Guide

### From console.log

```typescript
// Before
console.log('User created:', userId);
console.error('Failed to save:', error);

// After
logger.info('User created', { userId });
logger.error('Failed to save', error);
```

### From Other Loggers

```typescript
// Winston
winston.info('message', { meta: data });
// Becomes
logger.info('message', data);

// Bunyan
log.child({ component: 'auth' }).info('message');
// Becomes
logger.child({ component: 'auth' }).info('message');

// Pino
logger.info({ userId: 123 }, 'User action');
// Becomes
logger.info('User action', { userId: 123 });
```

## API Reference

### Logger Interface

```typescript
interface Logger {
  error(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}
```

### Factory Functions

```typescript
// Create a new logger instance
createLogger(options?: CreateLoggerOptions): Logger

// Options
interface CreateLoggerOptions {
  source?: string;      // Identifies the logger source
  context?: LogContext; // Default context for all logs
  level?: LogLevel;     // Override log level
}
```

### Frontend Helpers

```typescript
// Get logs from localStorage
getStoredLogs(): LogEntry[]

// Clear localStorage logs
clearStoredLogs(): void

// Set log level (persisted)
loggerFactory.setLogLevel(level: LogLevel | string): void
```

## Examples

### API Endpoint Logging

```typescript
// backend/routes/users.ts
import { createLogger } from '@/backend/lib/logger';

const logger = createLogger({ source: 'users-api' });

export async function createUser(req: Request) {
  const requestLogger = logger.child({ 
    requestId: req.id,
    method: 'POST',
    path: '/users',
  });
  
  // This will log to both terminal AND ./logger/app-YYYY-MM-DD.log
  requestLogger.info('Creating user');
  
  try {
    const user = await userService.create(req.body);
    requestLogger.info('User created successfully', { userId: user.id });
    return Response.json(user);
  } catch (error) {
    // Error logs appear in red in terminal and are saved to file
    requestLogger.error('Failed to create user', error);
    return Response.json({ error: 'Creation failed' }, { status: 500 });
  }
}
```

### Component Lifecycle Logging

```typescript
// frontend/components/UserProfile.ts
import { createLogger } from '@/frontend/lib/logger';

const logger = createLogger({ source: 'UserProfile' });

export class UserProfile extends HTMLElement {
  private userId: string;
  private componentLogger: Logger;
  
  constructor() {
    super();
    this.componentLogger = logger.child({ 
      component: 'UserProfile',
      instanceId: crypto.randomUUID(),
    });
  }
  
  connectedCallback() {
    this.componentLogger.debug('Component mounted');
    this.loadUserData();
  }
  
  async loadUserData() {
    this.componentLogger.info('Loading user data', { userId: this.userId });
    
    try {
      const data = await fetchUser(this.userId);
      this.componentLogger.debug('User data loaded', { 
        userId: this.userId,
        dataSize: JSON.stringify(data).length,
      });
    } catch (error) {
      this.componentLogger.error('Failed to load user data', error);
    }
  }
  
  disconnectedCallback() {
    this.componentLogger.debug('Component unmounted');
  }
}
```

### Database Query Logging

```typescript
// backend/lib/db.ts
import { createLogger } from '@/backend/lib/logger';

const logger = createLogger({ source: 'database' });

export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const queryLogger = logger.child({ 
    queryId: crypto.randomUUID(),
    sql: sql.substring(0, 100), // Truncate for logging
  });
  
  queryLogger.debug('Executing query', { params });
  const startTime = Date.now();
  
  try {
    const result = await db.query(sql, params);
    const duration = Date.now() - startTime;
    
    queryLogger.info('Query completed', { 
      duration,
      rowCount: result.rowCount,
    });
    
    return result;
  } catch (error) {
    queryLogger.error('Query failed', error);
    throw error;
  }
}
```