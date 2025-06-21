#!/usr/bin/env bun
import { db } from '../../backend/lib/db';
import { users, adminPermissions, adminRolePermissions, systemSettings } from '../../backend/models';
import { createLogger } from '../../backend/lib/logger';
import bcrypt from 'bcryptjs';

const logger = createLogger({ source: 'seed' });

async function seed() {
  logger.info('Starting database seeding...');
  
  try {
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [adminUser] = await db.insert(users).values({
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      isEmailVerified: true,
      metadata: {
        loginCount: 0,
        preferences: {
          theme: 'light',
          notifications: true,
        },
      },
    }).returning();
    
    logger.info('Created admin user', { email: adminUser.email });
    
    // Create default permissions
    const permissions = [
      // User management
      { name: 'users.read', description: 'View users', resource: 'users', action: 'read' },
      { name: 'users.write', description: 'Create and update users', resource: 'users', action: 'write' },
      { name: 'users.delete', description: 'Delete users', resource: 'users', action: 'delete' },
      
      // Analytics
      { name: 'analytics.read', description: 'View analytics', resource: 'analytics', action: 'read' },
      
      // Settings
      { name: 'settings.read', description: 'View settings', resource: 'settings', action: 'read' },
      { name: 'settings.write', description: 'Update settings', resource: 'settings', action: 'write' },
      
      // Activity logs
      { name: 'logs.read', description: 'View activity logs', resource: 'logs', action: 'read' },
    ];
    
    const insertedPermissions = await db.insert(adminPermissions).values(permissions).returning();
    logger.info('Created permissions', { count: insertedPermissions.length });
    
    // Assign all permissions to admin role
    const adminRolePerms = insertedPermissions.map(perm => ({
      role: 'admin' as const,
      permissionId: perm.id,
    }));
    
    await db.insert(adminRolePermissions).values(adminRolePerms);
    logger.info('Assigned permissions to admin role');
    
    // Assign limited permissions to moderator role
    const moderatorPerms = insertedPermissions
      .filter(p => p.action === 'read' || p.resource === 'users')
      .map(perm => ({
        role: 'moderator' as const,
        permissionId: perm.id,
      }));
    
    await db.insert(adminRolePermissions).values(moderatorPerms);
    logger.info('Assigned permissions to moderator role');
    
    // Create default system settings
    const settings = [
      {
        key: 'site.name',
        value: 'SaaS Admin Dashboard',
        category: 'general',
        description: 'The name of the application',
      },
      {
        key: 'site.maintenance',
        value: false,
        category: 'general',
        description: 'Enable maintenance mode',
      },
      {
        key: 'auth.registration_enabled',
        value: true,
        category: 'auth',
        description: 'Allow new user registrations',
      },
      {
        key: 'auth.require_email_verification',
        value: true,
        category: 'auth',
        description: 'Require email verification for new users',
      },
      {
        key: 'limits.max_users',
        value: 10000,
        category: 'limits',
        description: 'Maximum number of users allowed',
      },
      {
        key: 'email.from_address',
        value: 'noreply@saasadmin.com',
        category: 'email',
        description: 'Default from email address',
      },
    ];
    
    await db.insert(systemSettings).values(settings);
    logger.info('Created system settings', { count: settings.length });
    
    // Create sample users
    const sampleUsers = [
      {
        email: 'user1@example.com',
        password: await bcrypt.hash('user123', 10),
        name: 'John Doe',
        role: 'user' as const,
        isEmailVerified: true,
      },
      {
        email: 'user2@example.com',
        password: await bcrypt.hash('user123', 10),
        name: 'Jane Smith',
        role: 'user' as const,
        isEmailVerified: true,
      },
      {
        email: 'moderator@example.com',
        password: await bcrypt.hash('mod123', 10),
        name: 'Moderator User',
        role: 'moderator' as const,
        isEmailVerified: true,
      },
    ];
    
    await db.insert(users).values(sampleUsers);
    logger.info('Created sample users', { count: sampleUsers.length });
    
    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Seeding failed', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.main) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Seed script failed', error);
      process.exit(1);
    });
}

export { seed };