import { pgTable, uuid, varchar, integer, text, timestamp, jsonb, boolean, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './user.model';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Job status tracking model
 * User-visible job status (separate from pg-boss internal tables)
 */
export const userJobStatus = pgTable('user_job_status', {
  id: uuid('id').primaryKey(), // matches pg-boss job id
  userId: uuid('user_id').notNull().references(() => users.id),
  tenantId: uuid('tenant_id').notNull().default('00000000-0000-0000-0000-000000000000'),
  jobType: varchar('job_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'running', 'completed', 'failed'
  progress: integer('progress').default(0),
  message: text('message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  result: jsonb('result'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    userStatusIdx: index('idx_user_status').on(table.userId, table.status, table.createdAt),
    tenantJobsIdx: index('idx_tenant_jobs').on(table.tenantId, table.createdAt),
    progressCheck: check('progress_check', sql`${table.progress} >= 0 AND ${table.progress} <= 100`),
  };
});

/**
 * User job schedules
 * Stores cron schedules for recurring jobs per user
 */
export const userJobSchedules = pgTable('user_job_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  jobName: varchar('job_name', { length: 50 }).notNull(), // must match jobHandlers keys
  cronExpression: varchar('cron_expression', { length: 100 }),
  isActive: boolean('is_active').default(true),
  config: jsonb('config').default({}), // job-specific data
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    userJobUnique: index('idx_user_job_unique').on(table.userId, table.jobName),
  };
});

// Create Zod schemas
export const insertUserJobStatusSchema = createInsertSchema(userJobStatus, {
  status: z.enum(['pending', 'running', 'completed', 'failed']).default('pending'),
  progress: z.number().min(0).max(100).default(0),
});

export const selectUserJobStatusSchema = createSelectSchema(userJobStatus);

export const insertUserJobScheduleSchema = createInsertSchema(userJobSchedules, {
  cronExpression: z.string().regex(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/),
  timezone: z.string().default('UTC'),
  isActive: z.boolean().default(true),
});

export const selectUserJobScheduleSchema = createSelectSchema(userJobSchedules);

// Type exports
export type UserJobStatus = z.infer<typeof selectUserJobStatusSchema>;
export type NewUserJobStatus = z.infer<typeof insertUserJobStatusSchema>;
export type UserJobSchedule = z.infer<typeof selectUserJobScheduleSchema>;
export type NewUserJobSchedule = z.infer<typeof insertUserJobScheduleSchema>;