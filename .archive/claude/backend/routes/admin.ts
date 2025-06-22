import { z } from 'zod';
import { createLogger } from '../lib/logger';
import { requireAuth, requireRole } from '../middlewares/auth';
import { validateQuery, validateBody } from '../middlewares/validate';
import { adminService } from '../services/admin.service';
import { userService } from '../services/user.service';
import { registry } from '../lib/openapi';
import { ErrorSchema, PaginationSchema } from '../lib/openapi';

const logger = createLogger({ source: 'admin-routes' });

// Schemas
const AdminStatsSchema = z.object({
  totalUsers: z.number(),
  activeUsers: z.number(),
  totalRevenue: z.number(),
  newOrders: z.number(),
  revenueChange: z.number(),
  userChange: z.number(),
  orderChange: z.number(),
});

const ActivityLogSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid().nullable(),
  metadata: z.record(z.any()),
  adminEmail: z.string().email(),
  createdAt: z.string().datetime(),
});

const DashboardDataSchema = z.object({
  stats: AdminStatsSchema,
  recentActivity: z.array(ActivityLogSchema),
  widgets: z.array(z.object({
    id: z.string().uuid(),
    widgetType: z.string(),
    position: z.number(),
    config: z.record(z.any()),
    isVisible: z.boolean(),
  })),
});

// Register OpenAPI endpoints
registry.registerPath({
  method: 'get',
  path: '/api/admin/dashboard',
  summary: 'Get admin dashboard data',
  tags: ['Admin'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Dashboard data',
      content: {
        'application/json': {
          schema: DashboardDataSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Admin Dashboard
export async function getAdminDashboard(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  await requireRole(user, ['admin', 'moderator']);
  
  const requestLogger = (req as any).logger || logger;
  requestLogger.info('Fetching admin dashboard', { userId: user.id });
  
  try {
    const dashboardData = await adminService.getDashboardData(user.id);
    return Response.json(dashboardData);
  } catch (error) {
    requestLogger.error('Failed to fetch dashboard data', error);
    throw error;
  }
}

// Admin Stats
export async function getAdminStats(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  await requireRole(user, ['admin', 'moderator']);
  
  const stats = await adminService.getStats();
  return Response.json(stats);
}

// Activity Logs
export async function getAdminActivityLogs(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  await requireRole(user, ['admin']);
  
  const query = await validateQuery(req, z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    entityType: z.string().optional(),
    adminId: z.string().uuid().optional(),
  }));
  
  const logs = await adminService.getActivityLogs({
    page: query.page,
    limit: query.limit,
    entityType: query.entityType,
    adminId: query.adminId,
  });
  
  return Response.json(logs);
}

// User Management
export async function getAdminUsers(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  await requireRole(user, ['admin', 'moderator']);
  
  const query = await validateQuery(req, z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    search: z.string().optional(),
    role: z.enum(['admin', 'user', 'moderator']).optional(),
    isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  }));
  
  const users = await userService.listUsers({
    page: query.page,
    limit: query.limit,
    search: query.search,
    role: query.role,
    isActive: query.isActive,
  });
  
  return Response.json(users);
}

export async function getAdminUser(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  await requireRole(user, ['admin', 'moderator']);
  
  const { id } = (req as any).params;
  const targetUser = await userService.getUser(id);
  
  if (!targetUser) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }
  
  return Response.json(targetUser);
}

export async function updateAdminUser(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  await requireRole(user, ['admin']);
  
  const { id } = (req as any).params;
  const data = await validateBody(req, z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    role: z.enum(['admin', 'user', 'moderator']).optional(),
    isActive: z.boolean().optional(),
  }));
  
  const requestLogger = (req as any).logger || logger;
  
  // Log admin action
  await adminService.logActivity({
    adminId: user.id,
    action: 'user.updated',
    entityType: 'user',
    entityId: id,
    metadata: {
      changes: data,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    },
  });
  
  const updatedUser = await userService.updateUser(id, data);
  
  requestLogger.info('Admin updated user', {
    adminId: user.id,
    targetUserId: id,
    changes: Object.keys(data),
  });
  
  return Response.json(updatedUser);
}

export async function deleteAdminUser(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  await requireRole(user, ['admin']);
  
  const { id } = (req as any).params;
  
  if (id === user.id) {
    return Response.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }
  
  const requestLogger = (req as any).logger || logger;
  
  // Log admin action
  await adminService.logActivity({
    adminId: user.id,
    action: 'user.deleted',
    entityType: 'user',
    entityId: id,
    metadata: {
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    },
  });
  
  await userService.deleteUser(id);
  
  requestLogger.info('Admin deleted user', {
    adminId: user.id,
    targetUserId: id,
  });
  
  return Response.json({ success: true });
}

// Settings Management
export async function getAdminSettings(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  await requireRole(user, ['admin']);
  
  const query = await validateQuery(req, z.object({
    category: z.string().optional(),
  }));
  
  const settings = await adminService.getSettings(query.category);
  return Response.json(settings);
}

export async function updateAdminSettings(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  await requireRole(user, ['admin']);
  
  const data = await validateBody(req, z.object({
    settings: z.array(z.object({
      key: z.string(),
      value: z.any(),
      category: z.string().optional(),
      description: z.string().optional(),
    })),
  }));
  
  const requestLogger = (req as any).logger || logger;
  
  // Update settings
  const updatedSettings = await adminService.updateSettings(data.settings, user.id);
  
  // Log admin action
  await adminService.logActivity({
    adminId: user.id,
    action: 'settings.updated',
    entityType: 'settings',
    metadata: {
      keys: data.settings.map(s => s.key),
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    },
  });
  
  requestLogger.info('Admin updated settings', {
    adminId: user.id,
    settingsCount: data.settings.length,
  });
  
  return Response.json(updatedSettings);
}