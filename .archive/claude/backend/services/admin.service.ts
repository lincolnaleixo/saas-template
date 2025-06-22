/**
 * @fileoverview Admin service module for dashboard operations and system management
 * Handles admin-specific functionality including dashboard data, statistics,
 * activity logging, and system settings management
 */

import { db } from '../lib/db';
import { 
  adminActivityLogs, 
  adminDashboardWidgets, 
  systemSettings,
  users 
} from '../models';
import { eq, desc, and, sql, gte } from 'drizzle-orm';
import { createLogger } from '../lib/logger';

const logger = createLogger({ source: 'admin-service' });

/**
 * Admin service providing dashboard operations and system management
 * All methods include comprehensive error handling and logging
 */
export const adminService = {
  /**
   * Get comprehensive dashboard data for admin user
   * @param userId - The admin user's ID
   * @returns Promise resolving to dashboard data including stats, activity, and widgets
   * @throws {Error} When dashboard data cannot be retrieved
   */
  async getDashboardData(userId: string) {
    try {
      // Get user's dashboard widgets
      const widgets = await db.query.adminDashboardWidgets.findMany({
        where: and(
          eq(adminDashboardWidgets.userId, userId),
          eq(adminDashboardWidgets.isVisible, true)
        ),
        orderBy: [adminDashboardWidgets.position],
      });
      
      // Get stats
      const stats = await this.getStats();
      
      // Get recent activity
      const recentActivity = await this.getRecentActivity(10);
      
      return {
        stats,
        recentActivity,
        widgets,
      };
    } catch (error) {
      logger.error('Failed to get dashboard data', error);
      throw error;
    }
  },
  
  // Get admin statistics
  async getStats() {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Get user statistics
      const totalUsersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      const totalUsers = Number(totalUsersResult[0]?.count || 0);
      
      const activeUsersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isActive, true));
      const activeUsers = Number(activeUsersResult[0]?.count || 0);
      
      // Get this month's new users
      const newUsersThisMonthResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, thisMonth));
      const newUsersThisMonth = Number(newUsersThisMonthResult[0]?.count || 0);
      
      // Get last month's new users
      const newUsersLastMonthResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(
            gte(users.createdAt, lastMonth),
            sql`${users.createdAt} < ${thisMonth}`
          )
        );
      const newUsersLastMonth = Number(newUsersLastMonthResult[0]?.count || 0);
      
      // Calculate user growth percentage
      const userChange = newUsersLastMonth > 0
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
        : 100;
      
      // Mock revenue and order data (replace with real data)
      const totalRevenue = 45231;
      const revenueChange = 20.1;
      const newOrders = 12234;
      const orderChange = -5;
      
      return {
        totalUsers,
        activeUsers,
        totalRevenue,
        newOrders,
        revenueChange,
        userChange: Math.round(userChange * 10) / 10,
        orderChange,
      };
    } catch (error) {
      logger.error('Failed to get stats', error);
      throw error;
    }
  },
  
  // Get recent admin activity
  async getRecentActivity(limit: number = 20) {
    try {
      const activities = await db
        .select({
          id: adminActivityLogs.id,
          action: adminActivityLogs.action,
          entityType: adminActivityLogs.entityType,
          entityId: adminActivityLogs.entityId,
          metadata: adminActivityLogs.metadata,
          createdAt: adminActivityLogs.createdAt,
          adminEmail: users.email,
        })
        .from(adminActivityLogs)
        .leftJoin(users, eq(adminActivityLogs.adminId, users.id))
        .orderBy(desc(adminActivityLogs.createdAt))
        .limit(limit);
      
      return activities;
    } catch (error) {
      logger.error('Failed to get recent activity', error);
      throw error;
    }
  },
  
  // Get activity logs with pagination
  async getActivityLogs(params: {
    page: number;
    limit: number;
    entityType?: string;
    adminId?: string;
  }) {
    try {
      const { page, limit, entityType, adminId } = params;
      const offset = (page - 1) * limit;
      
      // Build where conditions
      const conditions = [];
      if (entityType) {
        conditions.push(eq(adminActivityLogs.entityType, entityType));
      }
      if (adminId) {
        conditions.push(eq(adminActivityLogs.adminId, adminId));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(adminActivityLogs)
        .where(whereClause);
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results
      const logs = await db
        .select({
          id: adminActivityLogs.id,
          action: adminActivityLogs.action,
          entityType: adminActivityLogs.entityType,
          entityId: adminActivityLogs.entityId,
          metadata: adminActivityLogs.metadata,
          createdAt: adminActivityLogs.createdAt,
          adminEmail: users.email,
          adminName: users.name,
        })
        .from(adminActivityLogs)
        .leftJoin(users, eq(adminActivityLogs.adminId, users.id))
        .where(whereClause)
        .orderBy(desc(adminActivityLogs.createdAt))
        .limit(limit)
        .offset(offset);
      
      return {
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get activity logs', error);
      throw error;
    }
  },
  
  // Log admin activity
  async logActivity(data: {
    adminId: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: any;
  }) {
    try {
      const [log] = await db.insert(adminActivityLogs).values(data).returning();
      logger.info('Admin activity logged', { action: data.action, adminId: data.adminId });
      return log;
    } catch (error) {
      logger.error('Failed to log admin activity', error);
      throw error;
    }
  },
  
  // Get system settings
  async getSettings(category?: string) {
    try {
      const conditions = category ? eq(systemSettings.category, category) : undefined;
      
      const settings = await db.query.systemSettings.findMany({
        where: conditions,
        orderBy: [systemSettings.category, systemSettings.key],
      });
      
      // Transform to key-value pairs grouped by category
      const grouped = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = {};
        }
        acc[setting.category][setting.key] = {
          value: setting.value,
          description: setting.description,
          updatedAt: setting.updatedAt,
        };
        return acc;
      }, {} as Record<string, any>);
      
      return grouped;
    } catch (error) {
      logger.error('Failed to get settings', error);
      throw error;
    }
  },
  
  // Update system settings
  async updateSettings(settings: Array<{
    key: string;
    value: any;
    category?: string;
    description?: string;
  }>, updatedBy: string) {
    try {
      const updatedSettings = [];
      
      for (const setting of settings) {
        const [updated] = await db
          .insert(systemSettings)
          .values({
            ...setting,
            updatedBy,
          })
          .onConflictDoUpdate({
            target: systemSettings.key,
            set: {
              value: setting.value,
              category: setting.category,
              description: setting.description,
              updatedBy,
              updatedAt: new Date(),
            },
          })
          .returning();
        
        updatedSettings.push(updated);
      }
      
      logger.info('Settings updated', { count: updatedSettings.length, updatedBy });
      return updatedSettings;
    } catch (error) {
      logger.error('Failed to update settings', error);
      throw error;
    }
  },
};