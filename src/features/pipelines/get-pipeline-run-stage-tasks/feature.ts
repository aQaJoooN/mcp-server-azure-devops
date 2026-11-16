import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion, defaultProject } from '../../../utils/environment';
import { z } from 'zod';
import { GetPipelineRunStageTasksSchema } from './schema';

export type GetPipelineRunStageTasksOptions = z.infer<
  typeof GetPipelineRunStageTasksSchema
>;

export interface StageTaskRecord {
  id: string;
  parentId?: string;
  type: string;
  name?: string;
  displayName?: string;
  startTime?: string;
  finishTime?: string;
  state?: string;
  result?: string;
  percentComplete?: number;
  logId?: number;
  order?: number;
  identifier?: string;
  stageName?: string;
  jobName?: string;
  errorCount?: number;
  warningCount?: number;
}

export interface PipelineRunStageTasks {
  runId: number;
  stages: {
    name: string;
    displayName?: string;
    state?: string;
    result?: string;
    jobs: {
      name: string;
      displayName?: string;
      state?: string;
      result?: string;
      tasks: StageTaskRecord[];
    }[];
  }[];
}

const API_VERSION = apiVersion;

/**
 * Returns the tasks (steps) for each job within each stage of a pipeline run,
 * optionally filtered to a specific stage/job.
 *
 * Uses the Build timeline API since all timeline records (stages, phases,
 * jobs, tasks) are available there, and we filter by type.
 */
export async function getPipelineRunStageTasks(
  connection: WebApi,
  options: GetPipelineRunStageTasksOptions,
): Promise<PipelineRunStageTasks> {
  try {
    const buildApi = await connection.getBuildApi();
    const projectId = options.projectId ?? defaultProject;
    const { runId } = options;

    const route = `${encodeURIComponent(projectId)}/_apis/build/builds/${runId}/timeline`;
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const url = new URL(route, `${baseUrl}/`);
    url.searchParams.set('api-version', API_VERSION);

    const requestOptions = buildApi.createRequestOptions(
      'application/json',
      API_VERSION,
    );

    const response = await buildApi.rest.get<{
      records?: Array<{
        id: string;
        parentId?: string;
        type?: string;
        name?: string;
        displayName?: string;
        startTime?: string;
        finishTime?: string;
        state?: number | string;
        result?: number | string;
        percentComplete?: number;
        log?: { id?: number };
        order?: number;
        identifier?: string;
        errorCount?: number;
        warningCount?: number;
      }>;
    } | null>(url.toString(), requestOptions);

    if (response.statusCode === 404 || !response.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Timeline not found for run ${runId} in project ${projectId}`,
      );
    }

    const records = response.result.records ?? [];

    // Index all records by id for parent lookup
    const byId = new Map(records.map((r) => [r.id, r]));

    // Helper to get a readable state/result string
    const stateStr = (v: number | string | undefined): string | undefined => {
      if (v === undefined || v === null) return undefined;
      if (typeof v === 'string') return v;
      const names = ['pending', 'inProgress', 'completed'];
      return names[v] ?? String(v);
    };
    const resultStr = (v: number | string | undefined): string | undefined => {
      if (v === undefined || v === null) return undefined;
      if (typeof v === 'string') return v;
      const names = [
        'succeeded',
        'succeededWithIssues',
        'failed',
        'canceled',
        'skipped',
        'abandoned',
      ];
      return names[v] ?? String(v);
    };

    // Collect stages, jobs, tasks
    const stageRecords = records.filter(
      (r) => r.type?.toLowerCase() === 'stage',
    );
    const jobRecords = records.filter((r) => r.type?.toLowerCase() === 'job' || r.type?.toLowerCase() === 'phase');
    const taskRecords = records.filter((r) => r.type?.toLowerCase() === 'task');

    // Filter by stageName/jobName if provided
    const stageNameLower = options.stageName?.toLowerCase();
    const jobNameLower = options.jobName?.toLowerCase();

    const filteredStages = stageNameLower
      ? stageRecords.filter(
          (s) =>
            s.name?.toLowerCase().includes(stageNameLower) ||
            s.displayName?.toLowerCase().includes(stageNameLower) ||
            s.identifier?.toLowerCase().includes(stageNameLower),
        )
      : stageRecords;

    const stageIds = new Set(filteredStages.map((s) => s.id));

    // Find jobs that belong to filtered stages
    const filteredJobs = jobRecords.filter((j) => {
      // Find the stage ancestor by walking parent chain
      let current = j;
      while (current.parentId) {
        if (stageIds.has(current.parentId)) return true;
        const parent = byId.get(current.parentId);
        if (!parent) break;
        current = parent;
      }
      return stageIds.has(j.parentId ?? '');
    });

    const filteredJobsFiltered = jobNameLower
      ? filteredJobs.filter(
          (j) =>
            j.name?.toLowerCase().includes(jobNameLower) ||
            j.displayName?.toLowerCase().includes(jobNameLower),
        )
      : filteredJobs;

    const jobIds = new Set(filteredJobsFiltered.map((j) => j.id));

    // Find tasks that belong to filtered jobs
    const filteredTasks = taskRecords.filter((t) => {
      let current = t;
      while (current.parentId) {
        if (jobIds.has(current.parentId)) return true;
        const parent = byId.get(current.parentId);
        if (!parent) break;
        current = parent;
      }
      return jobIds.has(t.parentId ?? '');
    });

    // Build output structure
    const result: PipelineRunStageTasks = {
      runId,
      stages: filteredStages.map((stage) => {
        const stageJobs = filteredJobsFiltered.filter((j) => {
          let current = j;
          while (current.parentId) {
            if (current.parentId === stage.id) return true;
            const parent = byId.get(current.parentId);
            if (!parent) break;
            current = parent;
          }
          return j.parentId === stage.id;
        });

        return {
          name: stage.name ?? stage.id,
          displayName: stage.displayName,
          state: stateStr(stage.state),
          result: resultStr(stage.result),
          jobs: stageJobs.map((job) => {
            const jobTasks = filteredTasks.filter((t) => {
              let current = t;
              while (current.parentId) {
                if (current.parentId === job.id) return true;
                const parent = byId.get(current.parentId);
                if (!parent) break;
                current = parent;
              }
              return t.parentId === job.id;
            });

            return {
              name: job.name ?? job.id,
              displayName: job.displayName,
              state: stateStr(job.state),
              result: resultStr(job.result),
              tasks: jobTasks
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((t) => ({
                  id: t.id,
                  parentId: t.parentId,
                  type: t.type ?? 'Task',
                  name: t.name,
                  displayName: t.displayName,
                  startTime: t.startTime,
                  finishTime: t.finishTime,
                  state: stateStr(t.state),
                  result: resultStr(t.result),
                  percentComplete: t.percentComplete,
                  logId: t.log?.id,
                  order: t.order,
                  identifier: t.identifier,
                  errorCount: t.errorCount,
                  warningCount: t.warningCount,
                })),
            };
          }),
        };
      }),
    };

    return result;
  } catch (error) {
    if (error instanceof AzureDevOpsError) {
      throw error;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes('authentication') ||
        message.includes('unauthorized') ||
        message.includes('401')
      ) {
        throw new AzureDevOpsAuthenticationError(
          `Failed to authenticate: ${error.message}`,
        );
      }
      if (
        message.includes('not found') ||
        message.includes('does not exist') ||
        message.includes('404')
      ) {
        throw new AzureDevOpsResourceNotFoundError(
          `Pipeline stage tasks not found: ${error.message}`,
        );
      }
    }

    throw new AzureDevOpsError(
      `Failed to get pipeline run stage tasks: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
