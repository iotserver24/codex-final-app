import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IpcClient } from "@/ipc/ipc_client";

interface AgenticJob {
  id: string;
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
  taskResults?: TaskResult[];
  preview?: { url: string; screenshotPath?: string };
  summary: string;
  warnings: string[];
  errors: string[];
  createdAt: number;
  mode: "dry-run" | "interactive" | "auto-apply" | "force-apply";
}

interface AgenticPlan {
  id: string;
  description: string;
  tasks: AgenticTask[];
  estimatedIterations: number;
  dependencies: string[];
}

interface AgenticTask {
  id: string;
  description: string;
  type: "file_operation" | "code_generation" | "testing" | "validation";
  targetFiles: string[];
  dependencies: string[];
  estimatedTime: number;
}

interface TaskResult {
  taskId: string;
  status: "completed" | "failed" | "skipped";
  output: string;
  errors: string[];
  filesModified: string[];
  executionTime: number;
}

interface ProgressUpdate {
  type:
    | "status"
    | "task_start"
    | "task_complete"
    | "error"
    | "warning"
    | "file_created"
    | "file_updated"
    | "command_executed"
    | "package_installed";
  message: string;
  data?: any;
  timestamp: number;
}

export const AgenticModeInterface: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [executionMode, setExecutionMode] = useState<
    "dry-run" | "interactive" | "auto-apply" | "force-apply"
  >("dry-run");
  const [isRunning, setIsRunning] = useState(false);
  const [currentJob, setCurrentJob] = useState<AgenticJob | null>(null);
  const [jobHistory, setJobHistory] = useState<AgenticJob[]>([]);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);

  const progressRef = useRef<HTMLDivElement>(null);
  const ipcClient = IpcClient.getInstance();

  // Auto-scroll to latest progress update
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight;
    }
  }, [progressUpdates]);

  const addProgressUpdate = (update: ProgressUpdate) => {
    setProgressUpdates((prev) => [...prev, update]);
  };

  const startAgenticJob = async () => {
    if (!prompt.trim() || isRunning) return;

    setIsRunning(true);
    setProgressUpdates([]);

    try {
      // Create new autonomous agentic chat
      const response = await ipcClient.createAutonomousAgenticChat({
        prompt: prompt.trim(),
        mode: executionMode,
        chatId: Date.now(), // Use timestamp as chat ID for now
        maxIterations: 10,
      });

      if (!response.success || !response.agenticChatId) {
        throw new Error(
          response.error || "Failed to create autonomous agentic chat",
        );
      }

      const newJob: AgenticJob = {
        id: response.agenticChatId.toString(),
        status: "executing",
        progress: {
          phase: "executing",
          completedTasks: 0,
          totalTasks: 10, // Up to 10 iterations
          percentage: 0,
        },
        summary: "",
        warnings: [],
        errors: [],
        createdAt: Date.now(),
        mode: executionMode,
      };

      setCurrentJob(newJob);
      addProgressUpdate({
        type: "status",
        message:
          "🤖 Starting FULLY AUTONOMOUS AI agent (no manual intervention needed)...",
        timestamp: Date.now(),
      });

      // Start monitoring autonomous progress
      monitorAutonomousProgress(response.agenticChatId);
    } catch (error) {
      console.error("Failed to start agentic job:", error);
      addProgressUpdate({
        type: "error",
        message: `❌ Failed to start job: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      });
      setIsRunning(false);
    }
  };

  const monitorAutonomousProgress = async (agenticChatId: number) => {
    const pollInterval = 3000; // Poll every 3 seconds for autonomous mode

    const poll = async () => {
      try {
        const statusResponse =
          await ipcClient.getAutonomousAgenticStatus(agenticChatId);

        if (statusResponse) {
          // Update job status based on autonomous status
          setCurrentJob((prev) => {
            if (!prev) return null;

            let newStatus = prev.status;
            let newPhase = prev.progress.phase;
            let newPercentage = Math.round(
              (statusResponse.currentIteration / 10) * 100,
            );

            if (statusResponse.status === "completed") {
              newStatus = "completed";
              newPhase = "completed";
              newPercentage = 100;
            } else if (statusResponse.status === "failed") {
              newStatus = "failed";
              newPhase = "completed";
            } else if (statusResponse.status === "stopped") {
              newStatus = "cancelled";
              newPhase = "completed";
            } else {
              newStatus = "executing";
              newPhase = "executing";
            }

            return {
              ...prev,
              status: newStatus,
              progress: {
                ...prev.progress,
                phase: newPhase,
                percentage: newPercentage,
                completedTasks: statusResponse.currentIteration,
                totalTasks: 10,
                currentTask: `Iteration ${statusResponse.currentIteration}/10: ${statusResponse.lastMessage.substring(0, 80)}...`,
              },
            };
          });

          // Add progress updates for new iterations
          if (statusResponse.iterations.length > 0) {
            const latestIteration =
              statusResponse.iterations[statusResponse.iterations.length - 1];
            const lastUpdate = progressUpdates[progressUpdates.length - 1];

            if (!lastUpdate || lastUpdate.message !== latestIteration.message) {
              let updateType: ProgressUpdate["type"] = "status";
              let message = latestIteration.message;

              if (
                message.includes("❌") ||
                message.includes("failed") ||
                message.includes("error")
              ) {
                updateType = "error";
              } else if (
                message.includes("⚠️") ||
                message.includes("warning")
              ) {
                updateType = "warning";
              } else if (
                message.includes("✅") ||
                message.includes("completed")
              ) {
                updateType = "task_complete";
              } else if (
                message.includes("🔄") ||
                message.includes("iteration")
              ) {
                updateType = "task_start";
              }

              addProgressUpdate({
                type: updateType,
                message: message,
                timestamp: Date.now(),
              });
            }
          }

          // Check if job is complete
          if (
            statusResponse.status === "completed" ||
            statusResponse.status === "failed" ||
            statusResponse.status === "stopped"
          ) {
            setIsRunning(false);

            if (statusResponse.status === "completed") {
              addProgressUpdate({
                type: "status",
                message:
                  "🎉 AUTONOMOUS execution completed successfully! Task fully implemented.",
                timestamp: Date.now(),
              });
            } else if (statusResponse.status === "failed") {
              addProgressUpdate({
                type: "error",
                message:
                  "💥 Autonomous execution failed after maximum iterations.",
                timestamp: Date.now(),
              });
            } else if (statusResponse.status === "stopped") {
              addProgressUpdate({
                type: "status",
                message: "🛑 Autonomous execution stopped by user.",
                timestamp: Date.now(),
              });
            }

            // Add to job history
            setJobHistory((prev) => [
              {
                id: agenticChatId.toString(),
                status: statusResponse.status as any,
                progress: {
                  phase: "completed",
                  completedTasks: statusResponse.currentIteration,
                  totalTasks: 10,
                  percentage:
                    statusResponse.status === "completed"
                      ? 100
                      : Math.round(
                          (statusResponse.currentIteration / 10) * 100,
                        ),
                },
                summary: statusResponse.lastMessage,
                warnings: [],
                errors:
                  statusResponse.status === "failed"
                    ? [statusResponse.lastMessage]
                    : [],
                createdAt: Date.now(),
                mode: "dry-run",
              },
              ...prev.slice(0, 9),
            ]); // Keep last 10 jobs
            setCurrentJob(null);
            return; // Stop polling
          }
        }
      } catch (error) {
        console.error("Error monitoring autonomous progress:", error);
        addProgressUpdate({
          type: "error",
          message: `❌ Error monitoring autonomous execution: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: Date.now(),
        });
      }

      // Continue polling if job is still running
      if (isRunning) {
        setTimeout(poll, pollInterval);
      }
    };

    poll();
  };

  const cancelJob = async () => {
    if (!currentJob) return;

    try {
      await ipcClient.cancelAgenticJob(currentJob.id);
      setIsRunning(false);
      addProgressUpdate({
        type: "status",
        message: "🛑 Job cancelled by user",
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to cancel job:", error);
    }
  };

  const rollbackJob = async (jobId: string) => {
    try {
      await ipcClient.rollbackAgenticJob({ jobId });
      addProgressUpdate({
        type: "status",
        message: `🔄 Rolled back job ${jobId}`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to rollback job:", error);
      addProgressUpdate({
        type: "error",
        message: `❌ Failed to rollback job: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "executing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "planning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getProgressIcon = (type: string) => {
    switch (type) {
      case "status":
        return "🤖";
      case "task_start":
        return "🔄";
      case "task_complete":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "file_created":
        return "📄";
      case "file_updated":
        return "✏️";
      case "command_executed":
        return "⚡";
      case "package_installed":
        return "📦";
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              🤖 Agentic Mode
            </h1>
            <p className="text-muted-foreground mt-1">
              Fully autonomous AI agent - works continuously until task
              completion (no manual intervention needed)
            </p>
          </div>
          {currentJob && (
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(currentJob.status)}>
                {currentJob.status}
              </Badge>
              {isRunning && (
                <Button variant="outline" size="sm" onClick={cancelJob}>
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Input Section */}
          <div className="p-6 border-b">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Describe what you want to build or modify:
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Create a user dashboard with analytics charts, authentication, and dark mode support"
                  className="min-h-[100px] resize-none"
                  disabled={isRunning}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Execution Mode:
                  </label>
                  <Select
                    value={executionMode}
                    onValueChange={(value: any) => setExecutionMode(value)}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dry-run">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Dry Run</span>
                          <span className="text-xs text-muted-foreground">
                            Generate patches without applying them (safe
                            preview)
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="interactive">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Interactive</span>
                          <span className="text-xs text-muted-foreground">
                            Ask for approval before applying each patch
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="auto-apply">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Auto Apply</span>
                          <span className="text-xs text-muted-foreground">
                            Automatically apply patches with git commits
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="force-apply">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Force Apply</span>
                          <span className="text-xs text-muted-foreground">
                            Apply patches and auto-merge to main branch
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-6">
                  <Button
                    onClick={startAgenticJob}
                    disabled={!prompt.trim() || isRunning}
                    className="min-w-[120px]"
                  >
                    {isRunning ? "Running..." : "Start Agent"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="flex-1 flex flex-col">
            {currentJob && (
              <div className="p-6 border-b">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Job Progress</h3>
                    <span className="text-sm text-muted-foreground">
                      {currentJob.progress.completedTasks}/
                      {currentJob.progress.totalTasks} tasks
                    </span>
                  </div>

                  <Progress
                    value={currentJob.progress.percentage}
                    className="h-2"
                  />

                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="outline">{currentJob.progress.phase}</Badge>
                    {currentJob.progress.currentTask && (
                      <span className="text-muted-foreground">
                        {currentJob.progress.currentTask}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress Updates */}
            <div className="flex-1 p-6">
              <h3 className="font-semibold mb-4">Real-time Updates</h3>
              <ScrollArea className="h-full" ref={progressRef}>
                <div className="space-y-2">
                  {progressUpdates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {isRunning
                        ? "Starting agentic job..."
                        : "No updates yet. Start a job to see progress."}
                    </div>
                  ) : (
                    progressUpdates.map((update, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <span className="text-lg">
                          {getProgressIcon(update.type)}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm">{update.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(update.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Job History Sidebar */}
        <div className="w-80 border-l bg-muted/20">
          <div className="p-6">
            <h3 className="font-semibold mb-4">Job History</h3>
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {jobHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No completed jobs yet
                  </div>
                ) : (
                  jobHistory.map((job) => (
                    <Card key={job.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {job.summary || "No summary available"}
                        </p>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {job.mode}
                          </Badge>
                          {job.status === "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rollbackJob(job.id)}
                              className="text-xs"
                            >
                              Rollback
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};
