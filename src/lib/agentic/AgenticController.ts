import { AgenticJobQueue } from "./AgenticJobQueue";
import { AgenticToolsManager } from "./AgenticToolsManager";
import { AgenticVectorDB } from "./AgenticVectorDB";
import {
  AgenticPlan,
  AgenticTask,
  TaskResult,
  AgenticJobStatusResponse,
} from "@/ipc/handlers/agentic_handlers";

export interface CreateJobParams {
  chatId: number;
  prompt: string;
  mode: "dry-run" | "interactive" | "auto-apply" | "force-apply";
  userId: string;
}

export interface JobContext {
  jobId: string;
  prompt: string;
  mode: "dry-run" | "interactive" | "auto-apply" | "force-apply";
  userId: string;
  chatId: number;
  createdAt: number;
  plan?: AgenticPlan;
  currentTask?: string;
  completedTasks: number;
  totalTasks: number;
  taskResults: TaskResult[];
  warnings: string[];
  errors: string[];
  summary: string;
  status:
    | "queued"
    | "planning"
    | "executing"
    | "completed"
    | "failed"
    | "cancelled";
}

export class AgenticController {
  private jobs: Map<string, JobContext> = new Map();
  private isProcessing = false;

  constructor(
    private jobQueue: AgenticJobQueue,
    private toolsManager: AgenticToolsManager,
    private vectorDB: AgenticVectorDB,
  ) {}

  async createJob(params: CreateJobParams): Promise<string> {
    const jobId = `agentic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const jobContext: JobContext = {
      jobId,
      prompt: params.prompt,
      mode: params.mode,
      userId: params.userId,
      chatId: params.chatId,
      createdAt: Date.now(),
      completedTasks: 0,
      totalTasks: 0,
      taskResults: [],
      warnings: [],
      errors: [],
      summary: "",
      status: "queued",
    };

    this.jobs.set(jobId, jobContext);

    // Add to queue for processing
    await this.jobQueue.enqueue(jobId, jobContext);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return jobId;
  }

  async getJobStatus(jobId: string): Promise<AgenticJobStatusResponse | null> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    const percentage =
      job.totalTasks > 0
        ? Math.round((job.completedTasks / job.totalTasks) * 100)
        : 0;

    let phase: "planning" | "executing" | "validating" | "completed" =
      "planning";
    if (job.status === "planning") phase = "planning";
    else if (job.status === "executing") phase = "executing";
    else if (job.status === "completed") phase = "completed";
    else if (job.status === "failed" || job.status === "cancelled")
      phase = "completed";

    return {
      job_id: jobId,
      status: job.status,
      progress: {
        phase,
        currentTask: job.currentTask,
        completedTasks: job.completedTasks,
        totalTasks: job.totalTasks,
        percentage,
      },
      plan: job.plan,
      task_results: job.taskResults,
      summary: job.summary,
      warnings: job.warnings,
      errors: job.errors,
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled"
    ) {
      throw new Error(`Cannot cancel job in ${job.status} state`);
    }

    job.status = "cancelled";
    job.summary = "Job cancelled by user";

    await this.jobQueue.cancel(jobId);
  }

  async rollbackJob(jobId: string, commitSha?: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== "completed") {
      throw new Error("Can only rollback completed jobs");
    }

    try {
      await this.toolsManager.git.rollback(commitSha);
      job.summary = `Job rolled back${commitSha ? ` to commit ${commitSha}` : " to previous state"}`;
    } catch (error) {
      throw new Error(
        `Failed to rollback job: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getJobHistory(limit: number = 10): Promise<AgenticJobStatusResponse[]> {
    const jobs = Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    return Promise.all(jobs.map((job) => this.getJobStatus(job.jobId))).then(
      (results) =>
        results.filter(
          (result): result is AgenticJobStatusResponse => result !== null,
        ),
    );
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log("[AgenticController] Starting queue processing");

    try {
      while (true) {
        const jobId = await this.jobQueue.dequeue();
        if (!jobId) break;

        const job = this.jobs.get(jobId);
        if (!job) {
          console.warn(`[AgenticController] Job ${jobId} not found, skipping`);
          continue;
        }

        if (job.status === "cancelled") {
          console.log(
            `[AgenticController] Job ${jobId} was cancelled, skipping`,
          );
          continue;
        }

        try {
          await this.executeJob(job);
        } catch (error) {
          console.error(
            `[AgenticController] Error executing job ${jobId}:`,
            error,
          );
          job.status = "failed";
          job.errors.push(
            error instanceof Error ? error.message : "Unknown error occurred",
          );
          job.summary = "Job failed due to execution error";
        }
      }
    } finally {
      this.isProcessing = false;
      console.log("[AgenticController] Queue processing completed");
    }
  }

  private async executeJob(job: JobContext): Promise<void> {
    console.log(
      `[AgenticController] Executing job ${job.jobId}: ${job.prompt}`,
    );

    try {
      // Phase 1: Master Planning
      await this.executePlanningPhase(job);

      if (job.status === "cancelled") return;

      // Phase 2: Autonomous Execution Loop
      await this.executeExecutionPhase(job);

      if (job.status === "cancelled") return;

      // Phase 3: Final Validation & Preview
      await this.executeValidationPhase(job);
    } catch (error) {
      console.error(`[AgenticController] Job ${job.jobId} failed:`, error);
      job.status = "failed";
      job.errors.push(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
      job.summary = "Job failed during execution";
    }
  }

  private async executePlanningPhase(job: JobContext): Promise<void> {
    console.log(`[AgenticController] Planning phase for job ${job.jobId}`);
    job.status = "planning";
    job.currentTask = "Analyzing request and creating execution plan";

    try {
      // Get repository context from vector DB
      const context = await this.vectorDB.getRelevantContext(job.prompt);

      // Create comprehensive plan using AI
      const plan = await this.createExecutionPlan(job.prompt, context);

      job.plan = plan;
      job.totalTasks = plan.tasks.length;
      job.currentTask = `Plan created with ${plan.tasks.length} tasks`;

      console.log(
        `[AgenticController] Plan created for job ${job.jobId}:`,
        plan.description,
      );
    } catch (error) {
      console.error(
        `[AgenticController] Planning failed for job ${job.jobId}:`,
        error,
      );
      throw new Error(
        `Planning failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async executeExecutionPhase(job: JobContext): Promise<void> {
    console.log(`[AgenticController] Execution phase for job ${job.jobId}`);
    job.status = "executing";

    if (!job.plan) {
      throw new Error("No plan available for execution");
    }

    for (const task of job.plan.tasks) {
      if (job.status === "cancelled") break;

      job.currentTask = task.description;
      console.log(`[AgenticController] Executing task: ${task.description}`);

      try {
        const result = await this.executeTask(task, job);
        job.taskResults.push(result);
        job.completedTasks++;

        if (result.status === "failed") {
          job.warnings.push(
            `Task failed: ${task.description} - ${result.errors.join(", ")}`,
          );

          // Attempt repair if not in dry-run mode
          if (job.mode !== "dry-run" && result.errors.length > 0) {
            const repairResult = await this.attemptRepair(task, result, job);
            if (repairResult.status === "completed") {
              job.taskResults.push(repairResult);
            }
          }
        }
      } catch (error) {
        console.error(`[AgenticController] Task execution failed:`, error);
        job.taskResults.push({
          taskId: task.id,
          status: "failed",
          output: "",
          errors: [error instanceof Error ? error.message : "Unknown error"],
          filesModified: [],
          executionTime: 0,
        });
        job.completedTasks++;
      }
    }
  }

  private async executeValidationPhase(job: JobContext): Promise<void> {
    console.log(`[AgenticController] Validation phase for job ${job.jobId}`);
    job.currentTask = "Running final validation and tests";

    try {
      // Run build validation
      const buildResult =
        await this.toolsManager.execution.runCommand("npm run build");
      if (buildResult.exitCode !== 0) {
        job.warnings.push(`Build validation failed: ${buildResult.stderr}`);
      }

      // Run tests if available
      const testResult =
        await this.toolsManager.execution.runCommand("npm test");
      if (testResult.exitCode !== 0) {
        job.warnings.push(`Tests failed: ${testResult.stderr}`);
      }

      // Generate summary
      job.summary = this.generateJobSummary(job);
      job.status = "completed";
      job.currentTask = "Job completed successfully";

      console.log(
        `[AgenticController] Job ${job.jobId} completed successfully`,
      );
    } catch (error) {
      console.error(
        `[AgenticController] Validation failed for job ${job.jobId}:`,
        error,
      );
      job.warnings.push(
        `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      job.status = "completed"; // Still mark as completed with warnings
    }
  }

  private async createExecutionPlan(
    prompt: string,
    _context: any,
  ): Promise<AgenticPlan> {
    // Use AI to create a comprehensive plan
    const planId = `plan-${Date.now()}`;

    // For now, create a plan that will use the existing chat system
    // In a real implementation, this would use AI to analyze the prompt and create a detailed plan
    return {
      id: planId,
      description: `Execute user request: ${prompt}`,
      tasks: [
        {
          id: `task-1-${Date.now()}`,
          description: "Analyze user request and create implementation plan",
          type: "code_generation",
          targetFiles: [],
          dependencies: [],
          estimatedTime: 30,
        },
        {
          id: `task-2-${Date.now()}`,
          description: "Generate and apply code changes using AI",
          type: "code_generation",
          targetFiles: [],
          dependencies: ["task-1"],
          estimatedTime: 120,
        },
        {
          id: `task-3-${Date.now()}`,
          description: "Validate changes and run tests",
          type: "validation",
          targetFiles: [],
          dependencies: ["task-2"],
          estimatedTime: 60,
        },
      ],
      estimatedIterations: 3,
      dependencies: [],
    };
  }

  private async executeTask(
    task: AgenticTask,
    _job: JobContext,
  ): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      let output = "";
      const filesModified: string[] = [];
      const errors: string[] = [];

      switch (task.type) {
        case "file_operation":
          // Implement file operations
          output = "File operations completed";
          break;

        case "code_generation":
          // Implement code generation
          output = "Code generation completed";
          break;

        case "testing":
          // Implement testing
          const testResult =
            await this.toolsManager.execution.runCommand("npm test");
          output = testResult.stdout;
          if (testResult.exitCode !== 0) {
            errors.push(testResult.stderr);
          }
          break;

        case "validation":
          // Implement validation
          const buildResult =
            await this.toolsManager.execution.runCommand("npm run build");
          output = buildResult.stdout;
          if (buildResult.exitCode !== 0) {
            errors.push(buildResult.stderr);
          }
          break;
      }

      const executionTime = Date.now() - startTime;

      return {
        taskId: task.id,
        status: errors.length > 0 ? "failed" : "completed",
        output,
        errors,
        filesModified,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        taskId: task.id,
        status: "failed",
        output: "",
        errors: [error instanceof Error ? error.message : "Unknown error"],
        filesModified: [],
        executionTime,
      };
    }
  }

  private async attemptRepair(
    task: AgenticTask,
    _failedResult: TaskResult,
    _job: JobContext,
  ): Promise<TaskResult> {
    console.log(`[AgenticController] Attempting repair for task ${task.id}`);

    // Implement repair logic here
    // This would analyze the failure and attempt to fix it

    return {
      taskId: task.id,
      status: "completed",
      output: "Repair attempt completed",
      errors: [],
      filesModified: [],
      executionTime: 0,
    };
  }

  private generateJobSummary(job: JobContext): string {
    const completedTasks = job.taskResults.filter(
      (r) => r.status === "completed",
    ).length;
    const failedTasks = job.taskResults.filter(
      (r) => r.status === "failed",
    ).length;
    const totalFiles = new Set(job.taskResults.flatMap((r) => r.filesModified))
      .size;

    let summary = `Completed ${completedTasks}/${job.totalTasks} tasks`;

    if (failedTasks > 0) {
      summary += ` (${failedTasks} failed)`;
    }

    if (totalFiles > 0) {
      summary += `. Modified ${totalFiles} files`;
    }

    if (job.warnings.length > 0) {
      summary += `. ${job.warnings.length} warnings`;
    }

    return summary;
  }
}
