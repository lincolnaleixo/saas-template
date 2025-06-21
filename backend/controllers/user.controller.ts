import { userService } from '../services/user.service';
import { insertUserSchema, updateUserSchema } from '../models/user.model';
import { validateBody } from '../middlewares/validate';
import { requireAuth, requireRole, createSessionCookie, createBlankSessionCookie } from '../lib/auth';
import { createLogger } from '../lib/logger';
import { z } from 'zod';

/**
 * User controller
 * HTTP request handlers for user endpoints
 */

const logger = createLogger({ source: 'user-controller' });

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Password reset schemas
const requestResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export class UserController {
  /**
   * Register a new user
   * POST /api/users/register
   */
  async register(req: Request): Promise<Response> {
    try {
      const data = await validateBody(req, insertUserSchema);
      const user = await userService.create(data);
      
      logger.info('User registered', { userId: user.id });
      
      return Response.json({
        message: 'User created successfully. Please check your email to verify your account.',
        user,
      }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return Response.json({ error: 'Email already registered' }, { status: 409 });
      }
      throw error;
    }
  }
  
  /**
   * Login user
   * POST /api/users/login
   */
  async login(req: Request): Promise<Response> {
    try {
      const { email, password } = await validateBody(req, loginSchema);
      const { user, sessionId } = await userService.authenticate(email, password);
      
      logger.info('User logged in', { userId: user.id });
      
      return Response.json(
        { message: 'Login successful', user },
        { 
          status: 200,
          headers: {
            'Set-Cookie': createSessionCookie(sessionId),
          },
        }
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid credentials') {
          return Response.json({ error: 'Invalid email or password' }, { status: 401 });
        }
        if (error.message === 'Email not verified') {
          return Response.json({ error: 'Please verify your email before logging in' }, { status: 403 });
        }
      }
      throw error;
    }
  }
  
  /**
   * Logout user
   * POST /api/users/logout
   */
  async logout(req: Request): Promise<Response> {
    try {
      await requireAuth(req);
      
      return Response.json(
        { message: 'Logged out successfully' },
        {
          status: 200,
          headers: {
            'Set-Cookie': createBlankSessionCookie(),
          },
        }
      );
    } catch (error) {
      // Even if auth fails, clear the cookie
      return Response.json(
        { message: 'Logged out' },
        {
          status: 200,
          headers: {
            'Set-Cookie': createBlankSessionCookie(),
          },
        }
      );
    }
  }
  
  /**
   * Get current user
   * GET /api/users/me
   */
  async getMe(req: Request): Promise<Response> {
    const user = await requireAuth(req);
    
    const fullUser = await userService.findById(user.id);
    
    return Response.json({ user: fullUser });
  }
  
  /**
   * Update current user
   * PUT /api/users/me
   */
  async updateMe(req: Request): Promise<Response> {
    const user = await requireAuth(req);
    const data = await validateBody(req, updateUserSchema);
    
    // Prevent role changes through this endpoint
    delete data.role;
    
    const updatedUser = await userService.update(user.id, data);
    
    return Response.json({ 
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  }
  
  /**
   * Delete current user
   * DELETE /api/users/me
   */
  async deleteMe(req: Request): Promise<Response> {
    const user = await requireAuth(req);
    
    await userService.delete(user.id);
    
    return Response.json(
      { message: 'Account deleted successfully' },
      {
        status: 200,
        headers: {
          'Set-Cookie': createBlankSessionCookie(),
        },
      }
    );
  }
  
  /**
   * Verify email
   * GET /api/users/verify/:token
   */
  async verifyEmail(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const token = url.pathname.split('/').pop();
    
    if (!token) {
      return Response.json({ error: 'Invalid verification link' }, { status: 400 });
    }
    
    const verified = await userService.verifyEmail(token);
    
    if (!verified) {
      return Response.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }
    
    return Response.json({ message: 'Email verified successfully' });
  }
  
  /**
   * Request password reset
   * POST /api/users/reset-password
   */
  async requestPasswordReset(req: Request): Promise<Response> {
    const { email } = await validateBody(req, requestResetSchema);
    
    await userService.requestPasswordReset(email);
    
    // Always return success to avoid email enumeration
    return Response.json({ 
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  }
  
  /**
   * Reset password
   * POST /api/users/reset-password/:token
   */
  async resetPassword(req: Request): Promise<Response> {
    const data = await validateBody(req, resetPasswordSchema);
    
    const reset = await userService.resetPassword(data.token, data.password);
    
    if (!reset) {
      return Response.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }
    
    return Response.json({ message: 'Password reset successfully' });
  }
  
  /**
   * List all users (admin only)
   * GET /api/users
   */
  async listUsers(req: Request): Promise<Response> {
    await requireRole(req, 'admin');
    
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    const result = await userService.list(page, limit);
    
    return Response.json(result);
  }
  
  /**
   * Get user by ID (admin only)
   * GET /api/users/:id
   */
  async getUser(req: Request): Promise<Response> {
    await requireRole(req, 'admin');
    
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return Response.json({ error: 'User ID required' }, { status: 400 });
    }
    
    const user = await userService.findById(id);
    
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    
    return Response.json({ user });
  }
  
  /**
   * Update user (admin only)
   * PUT /api/users/:id
   */
  async updateUser(req: Request): Promise<Response> {
    await requireRole(req, 'admin');
    
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return Response.json({ error: 'User ID required' }, { status: 400 });
    }
    
    const data = await validateBody(req, updateUserSchema);
    const user = await userService.update(id, data);
    
    return Response.json({ 
      message: 'User updated successfully',
      user,
    });
  }
  
  /**
   * Delete user (admin only)
   * DELETE /api/users/:id
   */
  async deleteUser(req: Request): Promise<Response> {
    await requireRole(req, 'admin');
    
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return Response.json({ error: 'User ID required' }, { status: 400 });
    }
    
    await userService.delete(id);
    
    return Response.json({ message: 'User deleted successfully' });
  }
}

// Export singleton instance
export const userController = new UserController();