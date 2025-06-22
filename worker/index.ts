import { boss, jobHandlers } from '../backend/lib/jobs';
import { db } from '../backend/lib/db';
import { createLogger } from '../backend/lib/logger';
import { startHealthCheckServer } from './health';
import { eq } from 'drizzle-orm';

const logger = createLogger({ source: 'worker' });

// Start health check server
const healthPort = parseInt(process.env.PORT || '8002');
startHealthCheckServer(healthPort);

// Main worker initialization
async function startWorker() {
  try {
    logger.info('Starting worker service...');
    
    // Start pg-boss
    await boss.start();
    logger.info('pg-boss started successfully');
    
    // Register all job handlers
    for (const [jobName, handler] of Object.entries(jobHandlers)) {
      await boss.work(jobName, { teamSize: 5, teamConcurrency: 2 }, handler);
      logger.info('Registered job handler', { jobName });
    }
    
    // Load and schedule user cron jobs from database
    await loadUserSchedules();
    
    logger.info('Worker service started successfully');
  } catch (error) {
    logger.error('Failed to start worker', error);
    process.exit(1);
  }
}

// Load user schedules from database
async function loadUserSchedules() {
  try {
    // Check if userJobSchedules table exists
    const tables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_job_schedules'
    `);
    
    if (tables.rows.length === 0) {
      logger.warn('user_job_schedules table does not exist yet, skipping schedule loading');
      return;
    }
    
    // Load active schedules
    const schedules = await db.execute(`
      SELECT * FROM user_job_schedules 
      WHERE is_active = true
    `);
    
    logger.info('Loading user schedules', { count: schedules.rows.length });
    
    for (const schedule of schedules.rows) {
      if (schedule.cron_expression) {
        const scheduleName = `${schedule.job_name}-user-${schedule.user_id}`;
        
        try {
          await boss.schedule(
            scheduleName,
            schedule.cron_expression,
            schedule.job_name,
            { 
              userId: schedule.user_id,
              ...JSON.parse(schedule.config || '{}')
            },
            { 
              tz: schedule.timezone || 'UTC',
              singletonKey: scheduleName
            }
          );
          
          logger.debug('Scheduled user job', { 
            scheduleName, 
            userId: schedule.user_id,
            cron: schedule.cron_expression 
          });
        } catch (error) {
          logger.error('Failed to schedule user job', { 
            scheduleName, 
            error 
          });
        }
      }
    }
  } catch (error) {
    logger.error('Failed to load user schedules', error);
  }
}

// Helper function to update job progress
export async function updateJobProgress(
  jobId: string,
  userId: string,
  progress: number,
  message: string
) {
  try {
    await db.execute(`
      INSERT INTO user_job_status (id, user_id, progress, message, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        progress = EXCLUDED.progress,
        message = EXCLUDED.message,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      jobId,
      userId,
      progress,
      message,
      progress === 100 ? 'completed' : 'running'
    ]);
  } catch (error) {
    logger.error('Failed to update job progress', { jobId, error });
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  
  try {
    await boss.stop();
    logger.info('pg-boss stopped');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  
  try {
    await boss.stop();
    logger.info('pg-boss stopped');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
});

// Start the worker
startWorker().catch((error) => {
  logger.error('Fatal error starting worker', error);
  process.exit(1);
});