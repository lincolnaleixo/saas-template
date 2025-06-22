import { db, eq, and } from '../lib/db';
import { sql } from 'drizzle-orm';
import { users, userProfiles, NewUser, User, UpdateUser } from '../models/user.model';
import { createSession, invalidateUserSessions } from '../lib/auth';
import { cache } from '../lib/cache';
import { createLogger } from '../lib/logger';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

/**
 * User service
 * Business logic for user management
 */

const logger = createLogger({ source: 'user-service' });

export class UserService {
  /**
   * Create a new user
   */
  async create(data: NewUser): Promise<User> {
    logger.info('Creating new user', { email: data.email });
    
    try {
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, data.email),
      });
      
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex');
      
      // Create user
      const [newUser] = await db.insert(users).values({
        ...data,
        password: hashedPassword,
        verificationToken,
      }).returning();
      
      // Create user profile
      await db.insert(userProfiles).values({
        userId: newUser.id,
      });
      
      // TODO: Send verification email
      // await emailService.sendVerificationEmail(newUser.email, verificationToken);
      
      logger.info('User created successfully', { userId: newUser.id });
      
      // Return user without sensitive data
      const { password: _, verificationToken: __, resetToken: ___, ...safeUser } = newUser;
      return safeUser as User;
    } catch (error) {
      logger.error('Failed to create user', error as Error);
      throw error;
    }
  }
  
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    // Check cache first
    const cacheKey = `user:${id}`;
    const cachedUser = await cache.get<User>(cacheKey);
    
    if (cachedUser) {
      logger.debug('User found in cache', { userId: id });
      return cachedUser;
    }
    
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          profile: true,
        },
      });
      
      if (!user) {
        return null;
      }
      
      // Cache user data
      const { password: _, verificationToken: __, resetToken: ___, ...safeUser } = user;
      await cache.set(cacheKey, safeUser, 300); // 5 minutes
      
      return safeUser as any as User;
    } catch (error) {
      logger.error('Failed to find user by ID', { userId: id, error });
      throw error;
    }
  }
  
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
        with: {
          profile: true,
        },
      });
      
      if (!user) {
        return null;
      }
      
      const { password: _, verificationToken: __, resetToken: ___, ...safeUser } = user;
      return safeUser as any as User;
    } catch (error) {
      logger.error('Failed to find user by email', { email, error });
      throw error;
    }
  }
  
  /**
   * Update user
   */
  async update(id: string, data: UpdateUser): Promise<User> {
    logger.info('Updating user', { userId: id });
    
    try {
      // If password is being updated, hash it
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }
      
      const [updatedUser] = await db.update(users)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
      
      if (!updatedUser) {
        throw new Error('User not found');
      }
      
      // Clear cache
      await cache.del(`user:${id}`);
      
      logger.info('User updated successfully', { userId: id });
      
      const { password: _, verificationToken: __, resetToken: ___, ...safeUser } = updatedUser;
      return safeUser as User;
    } catch (error) {
      logger.error('Failed to update user', { userId: id, error });
      throw error;
    }
  }
  
  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    logger.info('Deleting user', { userId: id });
    
    try {
      // Invalidate all user sessions
      await invalidateUserSessions(id);
      
      // Delete user (cascade will handle related records)
      await db.delete(users).where(eq(users.id, id));
      
      // Clear cache
      await cache.del(`user:${id}`);
      
      logger.info('User deleted successfully', { userId: id });
    } catch (error) {
      logger.error('Failed to delete user', { userId: id, error });
      throw error;
    }
  }
  
  /**
   * Verify user email
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.verificationToken, token),
      });
      
      if (!user) {
        return false;
      }
      
      await db.update(users)
        .set({
          verified: true,
          verificationToken: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      logger.info('User email verified', { userId: user.id });
      return true;
    } catch (error) {
      logger.error('Failed to verify email', { token, error });
      throw error;
    }
  }
  
  /**
   * Authenticate user
   */
  async authenticate(email: string, password: string): Promise<{ user: User; sessionId: string }> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        throw new Error('Invalid credentials');
      }
      
      // Check if email is verified
      if (!user.verified) {
        throw new Error('Email not verified');
      }
      
      // Create session
      const sessionId = await createSession(user.id);
      
      logger.info('User authenticated', { userId: user.id });
      
      const { password: _, verificationToken: __, resetToken: ___, ...safeUser } = user;
      return {
        user: safeUser as User,
        sessionId,
      };
    } catch (error) {
      logger.error('Authentication failed', { email, error });
      throw error;
    }
  }
  
  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      
      if (!user) {
        // Don't reveal if user exists
        return;
      }
      
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
      
      await db.update(users)
        .set({
          resetToken,
          resetTokenExpiry,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      // TODO: Send password reset email
      // await emailService.sendPasswordResetEmail(user.email, resetToken);
      
      logger.info('Password reset requested', { userId: user.id });
    } catch (error) {
      logger.error('Failed to request password reset', { email, error });
      throw error;
    }
  }
  
  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.resetToken, token),
          // Check token is not expired
        ),
      });
      
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return false;
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db.update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      // Invalidate all sessions
      await invalidateUserSessions(user.id);
      
      logger.info('Password reset successfully', { userId: user.id });
      return true;
    } catch (error) {
      logger.error('Failed to reset password', { token, error });
      throw error;
    }
  }
  
  /**
   * List users with pagination
   */
  async list(page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      
      // Get users
      const userList = await db.query.users.findMany({
        limit,
        offset,
        orderBy: (users, { desc }) => [desc(users.createdAt)],
        with: {
          profile: true,
        },
      });
      
      // Remove sensitive data
      const safeUsers = userList.map(user => {
        const { password: _, verificationToken: __, resetToken: ___, ...safeUser } = user;
        return safeUser;
      });
      
      return {
        users: safeUsers,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to list users', error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const userService = new UserService();