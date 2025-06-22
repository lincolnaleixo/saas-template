import { boss, jobHandlers } from '../backend/lib/jobs';
import { sql } from '../backend/lib/db';
import { createLogger } from '../backend/lib/logger';
import { startHealthCheckServer } from './health';

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
      await boss.work(jobName, handler as any);
      logger.info('Registered job handler', { jobName });
    }
    
    // Load and schedule user cron jobs from database
    await loadUserSchedules();
    
    logger.info('Worker service started successfully');
  } catch (error) {
    logger.error('Failed to start worker', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Load user schedules from database
async function loadUserSchedules() {
  try {
    // Check if userJobSchedules table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_job_schedules'
    `;
    
    if (tables.length === 0) {
      logger.warn('user_job_schedules table does not exist yet, skipping schedule loading');
      return;
    }
    
    // Load active schedules
    const schedules = await sql`
      SELECT * FROM user_job_schedules 
      WHERE is_active = true
    `;
    
    logger.info('Loading user schedules', { count: schedules.length });
    
    for (const schedule of schedules) {
      if (schedule.cron_expression) {
        const scheduleName = `${schedule.job_name}-user-${schedule.user_id}`;
        
        try {
          await boss.schedule(
            scheduleName,
            schedule.cron_expression,
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
    logger.error('Failed to load user schedules', error instanceof Error ? error : new Error(String(error)));
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
    await sql`
      INSERT INTO user_job_status (id, user_id, progress, message, status, updated_at)
      VALUES (${jobId}, ${userId}, ${progress}, ${message}, ${progress === 100 ? 'completed' : 'running'}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        progress = EXCLUDED.progress,
        message = EXCLUDED.message,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `;
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
    logger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)));
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
    logger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
});

// Start the worker
startWorker().catch((error) => {
  logger.error('Fatal error starting worker', error);
  process.exit(1);
});