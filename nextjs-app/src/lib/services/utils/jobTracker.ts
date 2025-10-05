/**
 * Job Tracking Utility
 * Fire Department Radio Transcription System
 *
 * In-memory job tracking for asynchronous operations like transcription
 * and policy document conversion. Provides status updates and progress tracking.
 *
 * NOTE: This is a simple in-memory implementation suitable for development
 * and single-instance deployments. For production multi-instance deployments,
 * replace with Redis-backed or database-backed job queue (e.g., Bull, BullMQ).
 */

import type { AsyncJobResult, JobStatus } from '@/lib/types';
import { randomUUID } from 'crypto';

/**
 * Job data stored in the tracker
 */
interface JobData<T> extends AsyncJobResult<T> {
  lastUpdated: Date;
}

/**
 * Job Tracker class for managing asynchronous operations
 *
 * Provides CRUD operations for job tracking, progress updates,
 * and automatic cleanup of old completed jobs.
 */
class JobTracker {
  private jobs: Map<string, JobData<any>> = new Map();
  private readonly maxCompletedJobAge: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Cleanup old jobs every hour
    setInterval(() => this.cleanupOldJobs(), 60 * 60 * 1000);
  }

  /**
   * Create a new job with PENDING status
   *
   * @template T The type of the job result
   * @param {string} jobType - Type of job (e.g., 'transcription', 'policy_conversion')
   * @returns {AsyncJobResult<T>} New job with generated ID
   *
   * @example
   * ```typescript
   * const job = jobTracker.createJob<TranscriptionResult>('transcription');
   * console.log(job.jobId); // Generated UUID
   * ```
   */
  createJob<T>(jobType: string): AsyncJobResult<T> {
    const jobId = randomUUID();
    const now = new Date();

    const job: JobData<T> = {
      jobId,
      status: 'PENDING',
      progress: 0,
      startedAt: now,
      lastUpdated: now,
    };

    this.jobs.set(jobId, job);

    return this.getJobSnapshot(job);
  }

  /**
   * Get job status and details
   *
   * @template T The type of the job result
   * @param {string} jobId - Job ID to retrieve
   * @returns {AsyncJobResult<T> | null} Job details or null if not found
   *
   * @example
   * ```typescript
   * const job = jobTracker.getJob<TranscriptionResult>(jobId);
   * if (job && job.status === 'COMPLETED') {
   *   console.log('Result:', job.result);
   * }
   * ```
   */
  getJob<T>(jobId: string): AsyncJobResult<T> | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return this.getJobSnapshot(job);
  }

  /**
   * Update job status
   *
   * @param {string} jobId - Job ID to update
   * @param {JobStatus} status - New status
   *
   * @example
   * ```typescript
   * jobTracker.updateStatus(jobId, 'PROCESSING');
   * ```
   */
  updateStatus(jobId: string, status: JobStatus): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = status;
    job.lastUpdated = new Date();
  }

  /**
   * Update job progress (0-100)
   *
   * @param {string} jobId - Job ID to update
   * @param {number} progress - Progress percentage (0-100)
   *
   * @example
   * ```typescript
   * jobTracker.updateProgress(jobId, 50); // 50% complete
   * ```
   */
  updateProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.progress = Math.max(0, Math.min(100, progress));
    job.lastUpdated = new Date();

    // Auto-update status to PROCESSING if still PENDING
    if (job.status === 'PENDING' && progress > 0) {
      job.status = 'PROCESSING';
    }
  }

  /**
   * Mark job as completed with result
   *
   * @template T The type of the job result
   * @param {string} jobId - Job ID to complete
   * @param {T} result - Job result data
   *
   * @example
   * ```typescript
   * jobTracker.completeJob(jobId, transcriptionResult);
   * ```
   */
  completeJob<T>(jobId: string, result: T): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'COMPLETED';
    job.progress = 100;
    job.result = result;
    job.completedAt = new Date();
    job.lastUpdated = new Date();
  }

  /**
   * Mark job as failed with error message
   *
   * @param {string} jobId - Job ID to fail
   * @param {string} error - Error message
   *
   * @example
   * ```typescript
   * jobTracker.failJob(jobId, 'Transcription failed: Audio file corrupted');
   * ```
   */
  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'FAILED';
    job.error = error;
    job.completedAt = new Date();
    job.lastUpdated = new Date();
  }

  /**
   * Delete a job from the tracker
   *
   * @param {string} jobId - Job ID to delete
   * @returns {boolean} True if job was deleted, false if not found
   *
   * @example
   * ```typescript
   * const deleted = jobTracker.deleteJob(jobId);
   * ```
   */
  deleteJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  /**
   * Get all jobs (optionally filtered by status)
   *
   * @param {JobStatus} status - Optional status filter
   * @returns {AsyncJobResult<any>[]} Array of jobs
   *
   * @example
   * ```typescript
   * const processingJobs = jobTracker.getAllJobs('PROCESSING');
   * const allJobs = jobTracker.getAllJobs();
   * ```
   */
  getAllJobs(status?: JobStatus): AsyncJobResult<any>[] {
    const jobs = Array.from(this.jobs.values());

    if (status) {
      return jobs
        .filter((job) => job.status === status)
        .map((job) => this.getJobSnapshot(job));
    }

    return jobs.map((job) => this.getJobSnapshot(job));
  }

  /**
   * Get job count by status
   *
   * @returns {object} Count of jobs by status
   *
   * @example
   * ```typescript
   * const counts = jobTracker.getJobCounts();
   * console.log(`Processing: ${counts.PROCESSING}`);
   * ```
   */
  getJobCounts(): Record<JobStatus, number> {
    const counts: Record<JobStatus, number> = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
    };

    for (const job of this.jobs.values()) {
      counts[job.status]++;
    }

    return counts;
  }

  /**
   * Clean up old completed/failed jobs
   *
   * Removes jobs older than maxCompletedJobAge (default: 24 hours)
   */
  private cleanupOldJobs(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'COMPLETED' || job.status === 'FAILED') &&
        job.completedAt
      ) {
        const age = now - job.completedAt.getTime();

        if (age > this.maxCompletedJobAge) {
          this.jobs.delete(jobId);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      console.log(`[JobTracker] Cleaned up ${cleaned} old jobs`);
    }
  }

  /**
   * Create a clean snapshot of job data (without internal fields)
   */
  private getJobSnapshot<T>(job: JobData<T>): AsyncJobResult<T> {
    return {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Clear all jobs (useful for testing)
   */
  clearAll(): void {
    this.jobs.clear();
  }

  /**
   * Get total number of jobs in tracker
   */
  getTotalJobs(): number {
    return this.jobs.size;
  }
}

/**
 * Singleton job tracker instance
 */
export const jobTracker = new JobTracker();

/**
 * Helper function to run an async operation as a tracked job
 *
 * Automatically handles job creation, status updates, and error handling.
 *
 * @template T The type of the operation result
 * @param {string} jobType - Type of job for logging
 * @param {Function} operation - Async operation to run
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<AsyncJobResult<T>>} Job result with ID
 *
 * @example
 * ```typescript
 * const job = await runAsJob('transcription', async (updateProgress) => {
 *   updateProgress(25);
 *   const audio = await processAudio();
 *   updateProgress(50);
 *   const transcript = await transcribe(audio);
 *   updateProgress(100);
 *   return transcript;
 * });
 *
 * // Job ID available immediately
 * return NextResponse.json({ jobId: job.jobId });
 * ```
 */
export async function runAsJob<T>(
  jobType: string,
  operation: (updateProgress: (progress: number) => void) => Promise<T>
): Promise<AsyncJobResult<T>> {
  const job = jobTracker.createJob<T>(jobType);

  // Update progress helper
  const updateProgress = (progress: number) => {
    jobTracker.updateProgress(job.jobId, progress);
  };

  // Run operation in background (don't await)
  (async () => {
    try {
      jobTracker.updateStatus(job.jobId, 'PROCESSING');
      const result = await operation(updateProgress);
      jobTracker.completeJob(job.jobId, result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      jobTracker.failJob(job.jobId, errorMessage);
    }
  })();

  return job;
}

/**
 * Helper function to wait for a job to complete
 *
 * Polls the job status until it completes or fails.
 *
 * @template T The type of the job result
 * @param {string} jobId - Job ID to wait for
 * @param {number} pollInterval - Polling interval in ms (default: 1000)
 * @param {number} timeout - Max wait time in ms (default: 5 minutes)
 * @returns {Promise<T>} Job result
 * @throws {Error} If job fails or times out
 *
 * @example
 * ```typescript
 * try {
 *   const result = await waitForJob<TranscriptionResult>(jobId);
 *   console.log('Transcription:', result);
 * } catch (error) {
 *   console.error('Job failed:', error);
 * }
 * ```
 */
export async function waitForJob<T>(
  jobId: string,
  pollInterval: number = 1000,
  timeout: number = 5 * 60 * 1000
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    const job = jobTracker.getJob<T>(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'COMPLETED') {
      if (!job.result) {
        throw new Error(`Job ${jobId} completed without result`);
      }
      return job.result;
    }

    if (job.status === 'FAILED') {
      throw new Error(job.error || `Job ${jobId} failed`);
    }

    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error(`Job ${jobId} timed out after ${timeout}ms`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}
