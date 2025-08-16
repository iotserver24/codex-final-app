# Agentic Mode - Production Implementation

This document describes the production-grade agentic AI mode implementation in Codex, which provides autonomous feature development capabilities.

## Overview

Agentic Mode is an autonomous AI agent that can:

- Accept one or more user requests in a single prompt (batch requests)
- Plan, implement, validate, and test complete features across multi-file repositories
- Use tools (filesystem, git, sandboxed execution, tests, web search) as needed
- Provide continuous structured updates and final summaries with diffs and commits
- Operate safely with git branching, rollbacks, and configurable execution modes

## Architecture

### Core Components

1. **AgenticController** - Main orchestrator that manages the complete workflow
2. **AgenticToolsManager** - Provides filesystem, git, execution, and external API tools
3. **AgenticVectorDB** - Context management and code chunk indexing for relevant retrieval
4. **AgenticJobQueue** - Job lifecycle management with progress tracking and user quotas

### Execution Modes

- **dry-run**: Generate patches without applying them (safe preview)
- **interactive**: Ask for approval before applying each patch
- **auto-apply**: Automatically apply patches with git commits to feature branches
- **force-apply**: Apply patches and auto-merge to main branch (requires explicit opt-in)

## Workflow

### Phase 1: Master Planning

1. Analyze user request(s) and detect tech stack
2. Get repository manifest and relevant context from vector DB
3. Use stronger reasoning model to create comprehensive plan
4. Break down into ordered tasks with file-level actions
5. Estimate iterations and identify dependencies

### Phase 2: Autonomous Execution Loop

For each task:

1. **Context Analysis**: Fetch relevant files and context
2. **Patch Generation**: Create unified diff patches using editor model
3. **Application**: Apply patches (respecting execution mode)
4. **Git Management**: Commit changes to feature branch
5. **Validation**: Run tests, lints, and build checks
6. **Repair**: Fix failures through iterative refinement (max 6 iterations)

### Phase 3: Final Validation & Preview

1. Run full test suite and build validation
2. Start development server for preview
3. Generate final summary with diffs and commit history
4. Provide rollback options

## API Reference

### IPC Handlers

#### `agentic:create-job`

Creates a new agentic job with batch request support.

```typescript
interface CreateJobParams {
  chatId: number;
  prompt: string;
  mode?: "dry-run" | "interactive" | "auto-apply" | "force-apply";
  userId?: string;
}

interface CreateJobResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}
```

#### `agentic:get-job-status`

Gets comprehensive job status with structured response.

```typescript
interface JobStatusResponse {
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
```

#### `agentic:rollback-job`

Rollback job changes to a previous commit.

```typescript
interface RollbackParams {
  jobId: string;
  commitSha?: string; // Optional, uses latest rollback point if not provided
}
```

### Tool APIs

#### File System API

- `readFile(path: string): Promise<string>`
- `listFiles(globPattern: string): Promise<string[]>`
- `writeFile(path: string, contents: string): Promise<{ok: boolean, error?: string}>`
- `applyPatch(unifiedDiff: string): Promise<{ok: boolean, errors: string[]}>`

#### Git API

- `gitStatus(): Promise<string>`
- `gitBranch(name: string): Promise<{ok: boolean, error?: string}>`
- `gitCommit(message: string): Promise<{sha: string, error?: string}>`
- `gitCheckout(sha: string): Promise<{ok: boolean, error?: string}>`
- `gitRollback(commitSha: string): Promise<{ok: boolean, error?: string}>`

#### Execution API

- `runCommand(cmd: string, cwd?: string): Promise<{stdout: string, stderr: string, exitCode: number}>`
- `runTests(testCommand: string): Promise<{passed: boolean, stdout: string, stderr: string}>`

## UI Components

### AgenticModeInterface

Main interface for creating and managing agentic jobs.

Features:

- Multi-line prompt input with batch request support
- Execution mode selection with descriptions
- Job history with status indicators
- Real-time progress tracking

### AgenticProgressPanel

Detailed progress panel showing job execution status.

Features:

- Real-time job status updates
- Task-by-task progress visualization
- Diff viewing for each task
- Error and warning display
- Rollback and cancellation controls

## Safety Features

### Git Branch Management

- All changes committed to feature branches (`agent/{jobId}`)
- Never modifies main branch without explicit approval
- Automatic rollback points at each task completion
- One-click rollback to any previous state

### Validation & Testing

- Build validation after each task
- Test execution with failure handling
- Iterative repair with maximum iteration limits
- Final validation before completion

### User Controls

- Execution mode selection (dry-run for safety)
- Interactive approval for patches
- Job cancellation at any time
- Comprehensive audit trail with traces

## Configuration

### Model Strategy

The system uses a hybrid approach:

- **Planner**: Stronger reasoning model (GPT-4, Claude) for comprehensive planning
- **Editor**: Efficient model (GPT-3.5, smaller models) for patch generation
- **Fallback**: Stronger model when repairs fail repeatedly

### Resource Limits

- Maximum 6 iterations per task
- User quotas (10 jobs per hour by default)
- Maximum concurrent jobs (3 by default)
- Token usage tracking and cost estimation

## Usage Examples

### Single Feature Request

```
Create a user dashboard with charts showing analytics data
```

### Batch Requests

```
1. Add user authentication with JWT
2. Create a dashboard with analytics charts
3. Add data export functionality
4. Implement dark mode support
```

### Complex Feature

```
Build a complete todo application with:
- User registration and login
- Todo CRUD operations
- Drag and drop reordering
- Categories and tags
- Data persistence
- Mobile responsive design
```

## Monitoring & Debugging

### Traces

Every operation is traced with:

- Timestamp and event type
- Task and iteration context
- Token usage and costs
- Error details and repair attempts

### Statistics

- Queue statistics (total, by status, active jobs)
- Vector DB statistics (chunks by type and file)
- User quota usage
- Performance metrics

## Best Practices

### For Users

1. Start with dry-run mode to preview changes
2. Use descriptive, specific prompts
3. Break complex requests into logical steps
4. Review generated patches before approval
5. Keep rollback points for important milestones

### For Developers

1. Implement proper error handling in tools
2. Use structured logging for debugging
3. Monitor token usage and costs
4. Implement rate limiting and quotas
5. Regular cleanup of old jobs and traces

## Troubleshooting

### Common Issues

1. **Build failures**: Check dependencies and syntax
2. **Test failures**: Verify test commands and environment
3. **Git conflicts**: Use rollback and manual resolution
4. **Token limits**: Reduce context size or use smaller models
5. **Permission errors**: Check file system permissions

### Debug Tools

- Job traces for detailed execution history
- Vector DB statistics for context issues
- Queue statistics for performance monitoring
- Real-time progress updates for status tracking

## Future Enhancements

1. **Advanced Planning**: Multi-agent planning with specialized roles
2. **Code Review**: Automated code review and suggestions
3. **Performance Optimization**: Intelligent caching and context management
4. **Integration**: CI/CD pipeline integration
5. **Collaboration**: Multi-user job coordination
6. **Analytics**: Advanced metrics and insights
