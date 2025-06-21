import { z } from 'zod';

/**
 * Environment variable validation schema
 * Ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // API Configuration
  API_PORT: z.string().transform(Number).default('8000'),
  API_HOST: z.string().default('0.0.0.0'),
  
  // Database Configuration
  DATABASE_URL: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_POOL_SIZE: z.string().transform(Number).default('10'),
  DB_IDLE_TIMEOUT: z.string().transform(Number).default('30000'),
  DB_CONNECT_TIMEOUT: z.string().transform(Number).default('2000'),
  
  // Redis Configuration
  REDIS_URL: z.string(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().transform(Number).optional(),
  REDIS_PASSWORD: z.string().optional(),
  
  // Auth Configuration
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SESSION_SECRET: z.string(),
  SESSION_EXPIRES_IN: z.string().transform(Number).default('86400'), // 24 hours in seconds
  
  // CORS Configuration
  CORS_ORIGINS: z.string().transform((val) => val.split(',')).optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  
  // Email Configuration (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_TO_FILE: z.string().transform(val => val === 'true').default('true'),
  LOG_DIR: z.string().default('./logger'),
  LOG_MAX_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  LOG_MAX_FILES: z.string().transform(Number).default('10'),
  LOG_EMOJIS: z.string().transform(val => val === 'true').default('true'),
  LOG_COLORS: z.string().transform(val => val === 'true').default('true'),
  
  // Application Configuration
  APP_NAME: z.string().default('Conkero'),
  APP_VERSION: z.string().default('1.0.0'),
  APP_URL: z.string().optional(),
  
  // Worker Configuration
  WORKER_PORT: z.string().transform(Number).default('8002'),
  
  // Development Tools Ports
  PGADMIN_PORT: z.string().transform(Number).default('5050'),
  REDIS_INSIGHT_PORT: z.string().transform(Number).default('8001'),
  MAILDEV_PORT: z.string().transform(Number).default('1080'),
  MAILDEV_SMTP_PORT: z.string().transform(Number).default('1025'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

// Export validated environment variables
export const env = parseEnv();

// Export type for environment variables
export type Env = z.infer<typeof envSchema>;

// Helper to check if in production
export const isProduction = env.NODE_ENV === 'production';

// Helper to check if in development
export const isDevelopment = env.NODE_ENV === 'development';

// Helper to check if in test
export const isTest = env.NODE_ENV === 'test';