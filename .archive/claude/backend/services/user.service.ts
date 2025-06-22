import { db } from '../lib/db';
import { users } from '../models/user.model';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { createLogger } from '../lib/logger';
import bcrypt from 'bcryptjs';

const logger = createLogger({ source: 'user-service' });

export const userService = {
  // List users with pagination and filters
  async listUsers(params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }) {
    try {
      const { page, limit, search, role, isActive } = params;
      const offset = (page - 1) * limit;
      
      // Build where conditions
      const conditions = [];
      
      if (search) {
        conditions.push(
          or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )
        );
      }
      
      if (role) {
        conditions.push(eq(users.role, role as any));
      }
      
      if (isActive !== undefined) {
        conditions.push(eq(users.isActive, isActive));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results
      const usersList = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          avatar: users.avatar,
          isActive: users.isActive,
          isEmailVerified: users.isEmailVerified,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(users.createdAt)
        .limit(limit)
        .offset(offset);
      
      return {
        data: usersList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to list users', error);
      throw error;
    }
  },
  
  // Get user by ID
  async getUser(userId: string) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          password: false, // Exclude password
        },
      });
      
      return user;
    } catch (error) {
      logger.error('Failed to get user', error);
      throw error;
    }
  },
  
  // Create new user
  async createUser(data: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      const [user] = await db.insert(users).values({
        ...data,
        password: hashedPassword,
        role: (data.role || 'user') as any,
      }).returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      });
      
      logger.info('User created', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logger.error('Failed to create user', error);
      throw error;
    }
  },
  
  // Update user
  async updateUser(userId: string, data: {
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    avatar?: string;
    metadata?: any;
  }) {
    try {
      const updateData: any = { ...data };
      
      // If password is being updated, hash it
      if ('password' in data && data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }
      
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
          updatedAt: users.updatedAt,
        });
      
      if (!updatedUser) {
        throw new Error('User not found');
      }
      
      logger.info('User updated', { userId, changes: Object.keys(data) });
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user', error);
      throw error;
    }
  },
  
  // Delete user
  async deleteUser(userId: string) {
    try {
      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning({ id: users.id, email: users.email });
      
      if (!deletedUser) {
        throw new Error('User not found');
      }
      
      logger.info('User deleted', { userId, email: deletedUser.email });
      return true;
    } catch (error) {
      logger.error('Failed to delete user', error);
      throw error;
    }
  },
  
  // Update user metadata
  async updateUserMetadata(userId: string, metadata: any) {
    try {
      // Merge with existing metadata
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const updatedMetadata = {
        ...(user.metadata as any || {}),
        ...metadata,
        lastUpdated: new Date().toISOString(),
      };
      
      const [updated] = await db
        .update(users)
        .set({ metadata: updatedMetadata })
        .where(eq(users.id, userId))
        .returning();
      
      logger.info('User metadata updated', { userId });
      return updated;
    } catch (error) {
      logger.error('Failed to update user metadata', error);
      throw error;
    }
  },
  
  // Verify user email
  async verifyEmail(userId: string) {
    try {
      const [updated] = await db
        .update(users)
        .set({ isEmailVerified: true })
        .where(eq(users.id, userId))
        .returning();
      
      logger.info('User email verified', { userId });
      return updated;
    } catch (error) {
      logger.error('Failed to verify email', error);
      throw error;
    }
  },
};