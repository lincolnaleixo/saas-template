import PgBoss from 'pg-boss';
import { env } from '../config/env';
import { db } from './db';
import { userJobStatus } from '../models/job.model';
import { createLogger } from './logger';
import { eq } from 'drizzle-orm';

/**
 * Job queue setup using pg-boss
 * Provides background job processing with PostgreSQL
 */

const logger = createLogger({ source: 'jobs' });

// Initialize pg-boss
export const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  schema: 'pgboss',
  
  // Archive completed jobs for 30 days
  archiveCompletedAfterSeconds: 60 * 60 * 24 * 30,
  
  // Monitor configuration
  monitorStateIntervalSeconds: 10,
  
  // Delete archived jobs older than 90 days
  deleteAfterDays: 90,
});

// Job data types
export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  userId?: string;
}

export interface ReportJobData {
  userId: string;
  reportType: string;
  format?: 'pdf' | 'excel' | 'csv';
}

export interface UserSyncJobData {
  userId: string;
  tenantId: string;
  syncType?: 'full' | 'incremental';
}

// Define job handlers with progress tracking
export const jobHandlers = {
  'send-email': async (job: PgBoss.Job<EmailJobData>) => {
    const { to, subject, body, userId } = job.data;
    
    logger.info('Sending email', { to, subject, jobId: job.id });
    
    // Update job progress if userId provided
    if (userId) {
      await updateJobProgress(job.id, userId, 0, 'Preparing email...');
    }
    
    try {
      // TODO: Implement actual email sending
      // await emailService.send({ to, subject, body });
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (userId) {
        await updateJobProgress(job.id, userId, 100, 'Email sent successfully');
      }
      
      logger.info('Email sent successfully', { to, jobId: job.id });
      return { success: true, sentAt: new Date() };
    } catch (error) {
      logger.error('Failed to send email', { to, jobId: job.id, error });
      throw error;
    }
  },
  
  'generate-report': async (job: PgBoss.Job<ReportJobData>) => {
    const { userId, reportType, format = 'pdf' } = job.data;
    
    logger.info('Generating report', { userId, reportType, format, jobId: job.id });
    
    await updateJobProgress(job.id, userId, 0, 'Starting report generation...');
    
    try {
      // TODO: Implement actual report generation
      // const report = await reportService.generate(userId, reportType, format);
      
      // Simulate report generation with progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await updateJobProgress(job.id, userId, progress, `Generating report... ${progress}%`);
      }
      
      logger.info('Report generated successfully', { userId, reportType, jobId: job.id });
      return { 
        success: true, 
        reportUrl: `/reports/${job.id}.${format}`,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to generate report', { userId, reportType, jobId: job.id, error });
      throw error;
    }
  },
  
  'sync-user-data': async (job: PgBoss.Job<UserSyncJobData>) => {
    const { userId, tenantId, syncType = 'incremental' } = job.data;
    
    logger.info('Syncing user data', { userId, tenantId, syncType, jobId: job.id });
    
    await updateJobProgress(job.id, userId, 0, 'Starting data sync...');
    
    try {
      // TODO: Implement actual data sync
      // const result = await syncService.syncUserData(userId, tenantId, syncType);
      
      // Simulate sync with progress
      const steps = [
        { progress: 20, message: 'Fetching user data...' },
        { progress: 40, message: 'Processing records...' },
        { progress: 60, message: 'Validating data...' },
        { progress: 80, message: 'Updating database...' },
        { progress: 100, message: 'Sync completed!' },
      ];
      
      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await updateJobProgress(job.id, userId, step.progress, step.message);
      }
      
      logger.info('User data synced successfully', { userId, jobId: job.id });
      return { 
        success: true, 
        recordsProcessed: 150,
        syncedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to sync user data', { userId, jobId: job.id, error });
      throw error;
    }
  },
} as const;

export type JobName = keyof typeof jobHandlers;

/**
 * Start the job queue and register handlers
 */
export async function startJobQueue(): Promise<void> {
  try {
    await boss.start();
    logger.info('Job queue started');
    
    // Register all job handlers
    for (const [jobName, handler] of Object.entries(jobHandlers)) {
      await boss.work(jobName, { teamSize: 5, teamConcurrency: 2 }, handler as any);
      logger.info('Job handler registered', { jobName });
    }
  } catch (error) {
    logger.error('Failed to start job queue', error as Error);
    throw error;
  }
}

/**
 * Stop the job queue gracefully
 */
export async function stopJobQueue(): Promise<void> {
  try {
    await boss.stop();
    logger.info('Job queue stopped');
  } catch (error) {
    logger.error('Failed to stop job queue', error as Error);
    throw error;
  }
}

/**
 * Helper function to update job progress (used in handlers)
 */
export async function updateJobProgress(
  jobId: string,
  userId: string,
  progress: number,
  message: string
): Promise<void> {
  try {
    const now = new Date();
    
    await db.insert(userJobStatus)
      .values({
        id: jobId,
        userId,
        tenantId: 'default', // TODO: Get from user context
        jobType: 'unknown', // Will be updated by handler
        status: progress === 100 ? 'completed' : 'running',
        progress,
        message,
        startedAt: progress === 0 ? now : undefined,
        completedAt: progress === 100 ? now : undefined,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userJobStatus.id,
        set: {
          progress,
          message,
          status: progress === 100 ? 'completed' : 'running',
          completedAt: progress === 100 ? now : undefined,
          updatedAt: now,
        },
      });
      
    logger.debug('Job progress updated', { jobId, userId, progress });
  } catch (error) {
    logger.error('Failed to update job progress', { jobId, userId, error });
  }
}

/**
 * Create a job and track it for the user
 */
export async function createJob<T extends JobName>(
  jobName: T,
  data: Parameters<typeof jobHandlers[T]>[0]['data'],
  options?: PgBoss.SendOptions
): Promise<string> {
  try {
    const jobId = await boss.send(jobName, data, options);
    
    // Track job for user if userId is provided
    if ('userId' in data) {
      await db.insert(userJobStatus).values({
        id: jobId,
        userId: data.userId as string,
        tenantId: 'tenantId' in data ? data.tenantId as string : 'default',
        jobType: jobName,
        status: 'pending',
        progress: 0,
        message: 'Job queued',
      });
    }
    
    logger.info('Job created', { jobName, jobId });
    return jobId;
  } catch (error) {
    logger.error('Failed to create job', { jobName, error });
    throw error;
  }
}

/**
 * Get job status for a user
 */
export async function getUserJobStatus(userId: string, limit: number = 20) {
  try {
    return await db.query.userJobStatus.findMany({
      where: eq(userJobStatus.userId, userId),
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
      limit,
    });
  } catch (error) {
    logger.error('Failed to get user job status', { userId, error });
    throw error;
  }
}