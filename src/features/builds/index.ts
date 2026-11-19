export * from './types';
export * from './get-build-details';
export * from './get-build-timeline';
export * from './get-failed-tasks';
export * from './get-task-log';
export * from './get-build-logs';
export * from './compare-builds';
export * from './get-build-changes';
export * from './search-failed-builds';
export * from './get-last-successful-build';
export * from './compare-failed-successful-builds';
export * from './tool-definitions';

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { WebApi } from 'azure-devops-node-api';
import {
  RequestIdentifier,
  RequestHandler,
} from '../../shared/types/request-handler';

import { GetBuildDetailsSchema } from './get-build-details/schema';
import { GetBuildTimelineSchema } from './get-build-timeline/schema';
import { GetFailedTasksSchema } from './get-failed-tasks/schema';
import { GetTaskLogSchema } from './get-task-log/schema';
import { GetBuildLogsSchema } from './get-build-logs/schema';
import { CompareBuildsSchema } from './compare-builds/schema';
import { GetBuildChangesSchema } from './get-build-changes/schema';
import { SearchFailedBuildsSchema } from './search-failed-builds/schema';
import { GetLastSuccessfulBuildSchema } from './get-last-successful-build/schema';
import { CompareFailedSuccessfulBuildsSchema } from './compare-failed-successful-builds/schema';

import { getBuildDetails } from './get-build-details/feature';
import { getBuildTimeline } from './get-build-timeline/feature';
import { getFailedTasks } from './get-failed-tasks/feature';
import { getTaskLog } from './get-task-log/feature';
import { getBuildLogs } from './get-build-logs/feature';
import { compareBuilds } from './compare-builds/feature';
import { getBuildChanges } from './get-build-changes/feature';
import { searchFailedBuilds } from './search-failed-builds/feature';
import { getLastSuccessfulBuild } from './get-last-successful-build/feature';
import { compareFailedSuccessfulBuilds } from './compare-failed-successful-builds/feature';

const BUILD_TOOL_NAMES = [
  'get_build_details',
  'get_build_timeline',
  'get_failed_tasks',
  'get_task_log',
  'get_build_logs',
  'compare_builds',
  'get_build_changes',
  'search_failed_builds',
  'get_last_successful_build',
  'compare_failed_successful_builds',
] as const;

export const isBuildsRequest: RequestIdentifier = (
  request: CallToolRequest,
): boolean => {
  return (BUILD_TOOL_NAMES as readonly string[]).includes(request.params.name);
};

export const handleBuildsRequest: RequestHandler = async (
  connection: WebApi,
  request: CallToolRequest,
): Promise<{ content: Array<{ type: string; text: string }> }> => {
  switch (request.params.name) {
    case 'get_build_details': {
      const args = GetBuildDetailsSchema.parse(request.params.arguments);
      const result = await getBuildDetails(
        connection,
        args.projectId,
        args.buildId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_build_timeline': {
      const args = GetBuildTimelineSchema.parse(request.params.arguments);
      const result = await getBuildTimeline(
        connection,
        args.projectId,
        args.buildId,
        args.timelineId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_failed_tasks': {
      const args = GetFailedTasksSchema.parse(request.params.arguments);
      const result = await getFailedTasks(
        connection,
        args.projectId,
        args.buildId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_task_log': {
      const args = GetTaskLogSchema.parse(request.params.arguments);
      const result = await getTaskLog(
        connection,
        args.projectId,
        args.buildId,
        args.logId,
        args.startLine,
        args.endLine,
      );
      return { content: [{ type: 'text', text: result }] };
    }
    case 'get_build_logs': {
      const args = GetBuildLogsSchema.parse(request.params.arguments);
      const result = await getBuildLogs(
        connection,
        args.projectId,
        args.buildId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'compare_builds': {
      const args = CompareBuildsSchema.parse(request.params.arguments);
      const result = await compareBuilds(
        connection,
        args.projectId,
        args.buildId1,
        args.buildId2,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_build_changes': {
      const args = GetBuildChangesSchema.parse(request.params.arguments);
      const result = await getBuildChanges(
        connection,
        args.projectId,
        args.buildId,
        args.top,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'search_failed_builds': {
      const args = SearchFailedBuildsSchema.parse(request.params.arguments);
      const result = await searchFailedBuilds(
        connection,
        args.projectId,
        args.definitionId,
        args.branchName,
        args.top,
        args.minTime,
        args.maxTime,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_last_successful_build': {
      const args = GetLastSuccessfulBuildSchema.parse(request.params.arguments);
      const result = await getLastSuccessfulBuild(
        connection,
        args.projectId,
        args.definitionId,
        args.branchName,
      );
      return {
        content: [
          {
            type: 'text',
            text: result
              ? JSON.stringify(result, null, 2)
              : 'No successful build found',
          },
        ],
      };
    }
    case 'compare_failed_successful_builds': {
      const args = CompareFailedSuccessfulBuildsSchema.parse(
        request.params.arguments,
      );
      const result = await compareFailedSuccessfulBuilds(
        connection,
        args.projectId,
        args.failedBuildId,
        args.definitionId,
        args.branchName,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    default:
      throw new Error(`Unknown builds tool: ${request.params.name}`);
  }
};
