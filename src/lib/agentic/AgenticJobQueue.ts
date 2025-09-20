export interface QueueJob {
  jobId: string;
  context: any;
  priority: number;
  createdAt: number;
}

export interface QueueStatistics {
  total: number;
  byStatus: Record<string, number>;
  activeJobs: number;
}

export class AgenticJobQueue {
  private queue: QueueJob[] = [];
  private activeJobs: Set<string> = new Set();
  private completedJobs: Set<string> = new Set();
  private failedJobs: Set<string> = new Set();
  private cancelledJobs: Set<string> = new Set();
  private maxConcurrentJobs = 3;
  private maxJobsPerHour = 10;

  async enqueue(
    jobId: string,
    context: any,
    priority: number = 0,
  ): Promise<void> {
    // Check rate limiting
    const recentJobs = this.getRecentJobs(60 * 60 * 1000); // Last hour
    if (recentJobs.length >= this.maxJobsPerHour) {
      throw new Error("Rate limit exceeded: too many jobs in the last hour");
    }

    const job: QueueJob = {
      jobId,
      context,
      priority,
      createdAt: Date.now(),
    };

    // Insert job in priority order (higher priority first)
    const insertIndex = this.queue.findIndex((j) => j.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    console.log(
      `[AgenticJobQueue] Job ${jobId} enqueued with priority ${priority}`,
    );
  }

  async dequeue(): Promise<string | null> {
    // Check if we can start a new job
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return null;
    }

    // Find the highest priority job that's not already active
    const jobIndex = this.queue.findIndex(
      (job) => !this.activeJobs.has(job.jobId),
    );
    if (jobIndex === -1) {
      return null;
    }

    const job = this.queue.splice(jobIndex, 1)[0];
    this.activeJobs.add(job.jobId);

    console.log(
      `[AgenticJobQueue] Job ${job.jobId} dequeued and marked as active`,
    );
    return job.jobId;
  }

  async cancel(jobId: string): Promise<void> {
    // Remove from queue if still queued
    const queueIndex = this.queue.findIndex((job) => job.jobId === jobId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
    }

    // Remove from active jobs
    this.activeJobs.delete(jobId);

    // Mark as cancelled
    this.cancelledJobs.add(jobId);

    console.log(`[AgenticJobQueue] Job ${jobId} cancelled`);
  }

  async markCompleted(jobId: string): Promise<void> {
    this.activeJobs.delete(jobId);
    this.completedJobs.add(jobId);

    console.log(`[AgenticJobQueue] Job ${jobId} marked as completed`);
  }

  async markFailed(jobId: string): Promise<void> {
    this.activeJobs.delete(jobId);
    this.failedJobs.add(jobId);

    console.log(`[AgenticJobQueue] Job ${jobId} marked as failed`);
  }

  getStatistics(): QueueStatistics {
    const total =
      this.queue.length +
      this.activeJobs.size +
      this.completedJobs.size +
      this.failedJobs.size +
      this.cancelledJobs.size;

    return {
      total,
      byStatus: {
        queued: this.queue.length,
        active: this.activeJobs.size,
        completed: this.completedJobs.size,
        failed: this.failedJobs.size,
        cancelled: this.cancelledJobs.size,
      },
      activeJobs: this.activeJobs.size,
    };
  }

  private getRecentJobs(timeWindow: number): QueueJob[] {
    const cutoff = Date.now() - timeWindow;
    return this.queue.filter((job) => job.createdAt > cutoff);
  }

  // Cleanup old completed/failed jobs to prevent memory leaks
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    // 24 hours default
    const _cutoff = Date.now() - maxAge;

    // Note: In a real implementation, you'd want to store timestamps for completed/failed jobs
    // For now, we'll just clear them periodically
    if (this.completedJobs.size > 100) {
      this.completedJobs.clear();
    }

    if (this.failedJobs.size > 100) {
      this.failedJobs.clear();
    }

    if (this.cancelledJobs.size > 100) {
      this.cancelledJobs.clear();
    }
  }
}
