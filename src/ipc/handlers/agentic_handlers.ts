import { ipcMain } from "electron";
import { AgenticController } from "@/lib/agentic/AgenticController";
import { AgenticJobQueue } from "@/lib/agentic/AgenticJobQueue";
import { AgenticToolsManager } from "@/lib/agentic/AgenticToolsManager";
import { AgenticVectorDB } from "@/lib/agentic/AgenticVectorDB";

// Initialize agentic components
const jobQueue = new AgenticJobQueue();
const toolsManager = new AgenticToolsManager();
const vectorDB = new AgenticVectorDB();
const controller = new AgenticController(jobQueue, toolsManager, vectorDB);

export interface CreateAgenticJobParams {
  chatId: number;
  prompt: string;
  mode?: "dry-run" | "interactive" | "auto-apply" | "force-apply";
  userId?: string;
}

export interface CreateAgenticJobResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}

export interface AgenticJobStatusResponse {
  job_id: string;
  status:
    | "queued"
    | "planning"
    | "executing"
    | "completed"
    | "failed"
    | "cancelled";
  progress: {
    phase: "planning" | "executing" | "validating" | "completed";
    currentTask?: string;
    completedTasks: number;
    totalTasks: number;
    percentage: number;
  };
  plan?: AgenticPlan;
  task_results?: TaskResult[];
  preview?: { url: string; screenshotPath?: string };
  summary: string;
  warnings: string[];
  errors: string[];
}

export interface AgenticPlan {
  id: string;
  description: string;
  tasks: AgenticTask[];
  estimatedIterations: number;
  dependencies: string[];
}

export interface AgenticTask {
  id: string;
  description: string;
  type: "file_operation" | "code_generation" | "testing" | "validation";
  targetFiles: string[];
  dependencies: string[];
  estimatedTime: number;
}

export interface TaskResult {
  taskId: string;
  status: "completed" | "failed" | "skipped";
  output: string;
  errors: string[];
  filesModified: string[];
  executionTime: number;
}

export interface RollbackParams {
  jobId: string;
  commitSha?: string;
}

export function registerAgenticHandlers() {
  // Create a new agentic job
  ipcMain.handle(
    "agentic:create-job",
    async (
      event,
      params: CreateAgenticJobParams,
    ): Promise<CreateAgenticJobResponse> => {
      try {
        console.log(
          "[agentic:create-job] Creating new job with params:",
          params,
        );

        const jobId = await controller.createJob({
          chatId: params.chatId,
          prompt: params.prompt,
          mode: params.mode || "dry-run",
          userId: params.userId || "default",
        });

        console.log("[agentic:create-job] Job created successfully:", jobId);

        return {
          success: true,
          jobId,
        };
      } catch (error) {
        console.error("[agentic:create-job] Error creating job:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Get job status
  ipcMain.handle(
    "agentic:get-job-status",
    async (event, jobId: string): Promise<AgenticJobStatusResponse | null> => {
      try {
        console.log("[agentic:get-job-status] Getting status for job:", jobId);

        const status = await controller.getJobStatus(jobId);

        if (!status) {
          console.log("[agentic:get-job-status] Job not found:", jobId);
          return null;
        }

        console.log(
          "[agentic:get-job-status] Job status retrieved:",
          status.status,
        );

        return status;
      } catch (error) {
        console.error(
          "[agentic:get-job-status] Error getting job status:",
          error,
        );
        throw new Error(
          error instanceof Error ? error.message : "Failed to get job status",
        );
      }
    },
  );

  // Cancel a job
  ipcMain.handle(
    "agentic:cancel-job",
    async (
      event,
      jobId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log("[agentic:cancel-job] Cancelling job:", jobId);

        await controller.cancelJob(jobId);

        console.log("[agentic:cancel-job] Job cancelled successfully:", jobId);

        return { success: true };
      } catch (error) {
        console.error("[agentic:cancel-job] Error cancelling job:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to cancel job",
        };
      }
    },
  );

  // Rollback a job
  ipcMain.handle(
    "agentic:rollback-job",
    async (
      event,
      params: RollbackParams,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log("[agentic:rollback-job] Rolling back job:", params.jobId);

        await controller.rollbackJob(params.jobId, params.commitSha);

        console.log(
          "[agentic:rollback-job] Job rolled back successfully:",
          params.jobId,
        );

        return { success: true };
      } catch (error) {
        console.error("[agentic:rollback-job] Error rolling back job:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to rollback job",
        };
      }
    },
  );

  // Get job history
  ipcMain.handle(
    "agentic:get-job-history",
    async (event, limit: number = 10): Promise<AgenticJobStatusResponse[]> => {
      try {
        console.log(
          "[agentic:get-job-history] Getting job history, limit:",
          limit,
        );

        const history = await controller.getJobHistory(limit);

        console.log(
          "[agentic:get-job-history] Retrieved",
          history.length,
          "jobs",
        );

        return history;
      } catch (error) {
        console.error(
          "[agentic:get-job-history] Error getting job history:",
          error,
        );
        throw new Error(
          error instanceof Error ? error.message : "Failed to get job history",
        );
      }
    },
  );

  // Get queue statistics
  ipcMain.handle(
    "agentic:get-queue-stats",
    async (
      _event,
    ): Promise<{
      total: number;
      byStatus: Record<string, number>;
      activeJobs: number;
    }> => {
      try {
        console.log("[agentic:get-queue-stats] Getting queue statistics");

        const stats = await jobQueue.getStatistics();

        console.log("[agentic:get-queue-stats] Queue stats:", stats);

        return stats;
      } catch (error) {
        console.error(
          "[agentic:get-queue-stats] Error getting queue stats:",
          error,
        );
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to get queue statistics",
        );
      }
    },
  );

  // Get vector DB statistics
  ipcMain.handle(
    "agentic:get-vector-stats",
    async (
      _event,
    ): Promise<{
      totalChunks: number;
      chunksByType: Record<string, number>;
      chunksByFile: Record<string, number>;
    }> => {
      try {
        console.log("[agentic:get-vector-stats] Getting vector DB statistics");

        const stats = await vectorDB.getStatistics();

        console.log("[agentic:get-vector-stats] Vector DB stats:", stats);

        return stats;
      } catch (error) {
        console.error(
          "[agentic:get-vector-stats] Error getting vector DB stats:",
          error,
        );
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to get vector DB statistics",
        );
      }
    },
  );

  console.log("[agentic] Agentic IPC handlers registered successfully");
}
