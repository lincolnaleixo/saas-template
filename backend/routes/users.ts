import { userController } from '../controllers/user.controller';
import { registry, UserSchema, commonResponses } from '../lib/openapi';
import { z } from 'zod';
import { insertUserSchema, updateUserSchema } from '../models/user.model';

/**
 * User routes definition and OpenAPI documentation
 */

// Define request/response schemas for OpenAPI
const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginResponseSchema = z.object({
  message: z.string(),
  user: UserSchema,
});

const RegisterResponseSchema = z.object({
  message: z.string(),
  user: UserSchema,
});

const UserListResponseSchema = z.object({
  users: z.array(UserSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Register OpenAPI documentation
registry.registerPath({
  method: 'post',
  path: '/api/users/register',
  summary: 'Register a new user',
  tags: ['Users'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: insertUserSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: RegisterResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/users/login',
  summary: 'Login user',
  tags: ['Users'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: LoginResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/users/logout',
  summary: 'Logout user',
  tags: ['Users'],
  security: [{ sessionCookie: [] }],
  responses: {
    200: {
      description: 'Logged out successfully',
      content: {
        'application/json': {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/users/me',
  summary: 'Get current user',
  tags: ['Users'],
  security: [{ sessionCookie: [] }],
  responses: {
    200: {
      description: 'Current user data',
      content: {
        'application/json': {
          schema: z.object({ user: UserSchema }),
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/users/me',
  summary: 'Update current user',
  tags: ['Users'],
  security: [{ sessionCookie: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: updateUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: z.object({ 
            message: z.string(),
            user: UserSchema,
          }),
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/users/me',
  summary: 'Delete current user account',
  tags: ['Users'],
  security: [{ sessionCookie: [] }],
  responses: {
    200: {
      description: 'Account deleted successfully',
      content: {
        'application/json': {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/users/verify/{token}',
  summary: 'Verify email address',
  tags: ['Users'],
  request: {
    params: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Email verified successfully',
      content: {
        'application/json': {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/users/reset-password',
  summary: 'Request password reset',
  tags: ['Users'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({ email: z.string().email() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password reset email sent (if account exists)',
      content: {
        'application/json': {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/users/reset-password/{token}',
  summary: 'Reset password with token',
  tags: ['Users'],
  request: {
    params: z.object({
      token: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
            password: z.string().min(8),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password reset successfully',
      content: {
        'application/json': {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    ...commonResponses,
  },
});

// Admin routes
registry.registerPath({
  method: 'get',
  path: '/api/users',
  summary: 'List all users (admin only)',
  tags: ['Users'],
  security: [{ sessionCookie: [] }],
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of users with pagination',
      content: {
        'application/json': {
          schema: UserListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/users/{id}',
  summary: 'Get user by ID (admin only)',
  tags: ['Users'],
  security: [{ sessionCookie: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'User data',
      content: {
        'application/json': {
          schema: z.object({ user: UserSchema }),
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/users/{id}',
  summary: 'Update user (admin only)',
  tags: ['Users'],
  security: [{ sessionCookie: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            user: UserSchema,
          }),
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/users/{id}',
  summary: 'Delete user (admin only)',
  tags: ['Users'],
  security: [{ sessionCookie: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'User deleted successfully',
      content: {
        'application/json': {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    ...commonResponses,
  },
});

// Export route handlers
export const userRoutes = {
  // Public routes
  'POST /api/users/register': userController.register.bind(userController),
  'POST /api/users/login': userController.login.bind(userController),
  'POST /api/users/logout': userController.logout.bind(userController),
  'GET /api/users/verify/:token': userController.verifyEmail.bind(userController),
  'POST /api/users/reset-password': userController.requestPasswordReset.bind(userController),
  'POST /api/users/reset-password/:token': userController.resetPassword.bind(userController),
  
  // Authenticated routes
  'GET /api/users/me': userController.getMe.bind(userController),
  'PUT /api/users/me': userController.updateMe.bind(userController),
  'DELETE /api/users/me': userController.deleteMe.bind(userController),
  
  // Admin routes
  'GET /api/users': userController.listUsers.bind(userController),
  'GET /api/users/:id': userController.getUser.bind(userController),
  'PUT /api/users/:id': userController.updateUser.bind(userController),
  'DELETE /api/users/:id': userController.deleteUser.bind(userController),
};