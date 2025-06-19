import { pgTable, text, timestamp, varchar, primaryKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date'
  }).notNull()
});

export const oauthAccounts = pgTable('oauth_accounts', {
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
}, (table) => ({
  pk: primaryKey({ columns: [table.providerId, table.providerUserId] })
}));

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;