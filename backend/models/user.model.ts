import { pgTable, uuid, varchar, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * User model definition
 * Main table for user accounts
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  verified: boolean('verified').notNull().default(false),
  verificationToken: varchar('verification_token', { length: 255 }),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    verificationTokenIdx: index('users_verification_token_idx').on(table.verificationToken),
    resetTokenIdx: index('users_reset_token_idx').on(table.resetToken),
  };
});

/**
 * Sessions table for Lucia auth
 */
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => {
  return {
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
  };
});

/**
 * User profiles table
 * Extended user information
 */
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  avatar: varchar('avatar', { length: 500 }),
  bio: varchar('bio', { length: 1000 }),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  language: varchar('language', { length: 10 }).default('en'),
  phoneNumber: varchar('phone_number', { length: 20 }),
  phoneVerified: boolean('phone_verified').default(false),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: uniqueIndex('user_profiles_user_id_idx').on(table.userId),
  };
});

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(sessions),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Create Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['user', 'admin']).default('user'),
});

export const selectUserSchema = createSelectSchema(users);

export const updateUserSchema = insertUserSchema.partial().omit({ id: true });

export const insertUserProfileSchema = createInsertSchema(userProfiles, {
  timezone: z.string().default('UTC'),
  language: z.string().length(2).default('en'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
});

export const selectUserProfileSchema = createSelectSchema(userProfiles);

// Type exports
export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UserProfile = z.infer<typeof selectUserProfileSchema>;
export type NewUserProfile = z.infer<typeof insertUserProfileSchema>;