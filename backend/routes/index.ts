import { createLogger } from '../lib/logger';
import { healthCheck } from './health';
import { serveApiDocs } from './docs';

// Admin routes
import { 
  getAdminDashboard,
  getAdminUsers,
  getAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAdminStats,
  getAdminActivityLogs,
  getAdminSettings,
  updateAdminSettings,
} from './admin';

// Auth routes
import {
  login,
  logout,
  register,
  getMe,
  refreshSession,
} from './auth';

// Import all route files to register OpenAPI definitions
import './admin';
import './auth';
import './health';
import './docs';

const logger = createLogger({ source: 'routes' });

// Route registry
export const routes: Record<string, (req: Request) => Promise<Response>> = {
  // Health check
  'GET /health': healthCheck,
  
  // API Documentation
  'GET /api-docs': serveApiDocs,
  'GET /api-docs/openapi.json': serveApiDocs,
  
  // Auth routes
  'POST /api/auth/login': login,
  'POST /api/auth/logout': logout,
  'POST /api/auth/register': register,
  'GET /api/auth/me': getMe,
  'POST /api/auth/refresh': refreshSession,
  
  // Admin routes
  'GET /api/admin/dashboard': getAdminDashboard,
  'GET /api/admin/stats': getAdminStats,
  'GET /api/admin/activity-logs': getAdminActivityLogs,
  'GET /api/admin/users': getAdminUsers,
  'GET /api/admin/users/:id': getAdminUser,
  'PUT /api/admin/users/:id': updateAdminUser,
  'DELETE /api/admin/users/:id': deleteAdminUser,
  'GET /api/admin/settings': getAdminSettings,
  'PUT /api/admin/settings': updateAdminSettings,
};

// Log registered routes on startup
logger.info('Routes registered', {
  count: Object.keys(routes).length,
  routes: Object.keys(routes),
});