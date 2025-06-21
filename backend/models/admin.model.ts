import { pgTable, uuid, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.model';
import { z } from 'zod';

// Admin activity logs
export const adminActivityLogs = pgTable('admin_activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // e.g., 'user.created', 'user.updated', 'user.deleted'
  entityType: text('entity_type').notNull(), // e.g., 'user', 'product', 'order'
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata').$type<{
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  }>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Admin permissions
export const adminPermissions = pgTable('admin_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(), // e.g., 'users.read', 'users.write', 'users.delete'
  description: text('description'),
  resource: text('resource').notNull(), // e.g., 'users', 'products', 'orders'
  action: text('action').notNull(), // e.g., 'read', 'write', 'delete'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Admin role permissions (many-to-many)
export const adminRolePermissions = pgTable('admin_role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: text('role').notNull(), // matches user roles: 'admin', 'moderator'
  permissionId: uuid('permission_id')
    .notNull()
    .references(() => adminPermissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Admin dashboard widgets configuration
export const adminDashboardWidgets = pgTable('admin_dashboard_widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  widgetType: text('widget_type').notNull(), // e.g., 'stats', 'chart', 'recent_activity'
  position: integer('position').notNull().default(0),
  config: jsonb('config').$type<{
    title?: string;
    size?: 'small' | 'medium' | 'large';
    chartType?: string;
    dataSource?: string;
    filters?: Record<string, any>;
  }>().default({}),
  isVisible: boolean('is_visible').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// System settings (key-value store for admin settings)
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').unique().notNull(),
  value: jsonb('value').notNull(),
  category: text('category').notNull().default('general'),
  description: text('description'),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const adminActivityLogsRelations = relations(adminActivityLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminActivityLogs.adminId],
    references: [users.id],
  }),
}));

export const adminRolePermissionsRelations = relations(adminRolePermissions, ({ one }) => ({
  permission: one(adminPermissions, {
    fields: [adminRolePermissions.permissionId],
    references: [adminPermissions.id],
  }),
}));

export const adminDashboardWidgetsRelations = relations(adminDashboardWidgets, ({ one }) => ({
  user: one(users, {
    fields: [adminDashboardWidgets.userId],
    references: [users.id],
  }),
}));

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));

// Validation schemas
export const createActivityLogSchema = z.object({
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid().optional(),
  metadata: z.object({
    changes: z.record(z.any()).optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    reason: z.string().optional(),
  }).optional(),
});

export const dashboardWidgetSchema = z.object({
  widgetType: z.enum(['stats', 'chart', 'recent_activity', 'quick_actions']),
  position: z.number().int().min(0).optional(),
  config: z.object({
    title: z.string().optional(),
    size: z.enum(['small', 'medium', 'large']).optional(),
    chartType: z.string().optional(),
    dataSource: z.string().optional(),
    filters: z.record(z.any()).optional(),
  }).optional(),
  isVisible: z.boolean().optional(),
});

export const systemSettingSchema = z.object({
  key: z.string(),
  value: z.any(),
  category: z.string().optional(),
  description: z.string().optional(),
});

// Type exports
export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;
export type AdminPermission = typeof adminPermissions.$inferSelect;
export type AdminRolePermission = typeof adminRolePermissions.$inferSelect;
export type AdminDashboardWidget = typeof adminDashboardWidgets.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;