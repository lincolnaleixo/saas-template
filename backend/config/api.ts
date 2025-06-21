import { env } from './env';

/**
 * API server configuration
 * Settings for the HTTP server and API behavior
 */
export const apiConfig = {
  // Server settings
  port: env.API_PORT,
  host: env.API_HOST,
  
  // CORS settings
  cors: {
    origins: env.CORS_ORIGINS || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'X-Request-ID'],
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW,
    max: env.RATE_LIMIT_MAX,
    message: 'Too many requests from this IP, please try again later.',
  },
  
  // Request settings
  bodyLimit: '10mb',
  
  // API versioning
  apiPrefix: '/api',
  currentVersion: 'v1',
  
  // Security headers
  security: {
    contentSecurityPolicy: env.NODE_ENV === 'production',
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    xXssProtection: '1; mode=block',
    strictTransportSecurity: env.NODE_ENV === 'production' ? 'max-age=31536000; includeSubDomains' : false,
  },
  
  // Health check path
  healthCheckPath: '/health',
  
  // Graceful shutdown timeout
  shutdownTimeout: 10000, // 10 seconds
};