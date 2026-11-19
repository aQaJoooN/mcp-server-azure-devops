import { toJsonSchema } from '../../shared/utils/to-json-schema';
import { ToolDefinition } from '../../shared/types/tool-definition';
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

export const buildsTools: ToolDefinition[] = [
  {
    name: 'get_build_details',
    description:
      'Retrieves build status, branch, commit, definition, and execution details',
    inputSchema: toJsonSchema(GetBuildDetailsSchema),
  },
  {
    name: 'get_build_timeline',
    description:
      'Retrieves the execution sequence of pipeline stages, jobs, and tasks for a build',
    inputSchema: toJsonSchema(GetBuildTimelineSchema),
  },
  {
    name: 'get_failed_tasks',
    description: 'Identifies failed and canceled tasks within a build',
    inputSchema: toJsonSchema(GetFailedTasksSchema),
  },
  {
    name: 'get_task_log',
    description: 'Retrieves logs for a specific pipeline task by log ID',
    inputSchema: toJsonSchema(GetTaskLogSchema),
  },
  {
    name: 'get_build_logs',
    description: 'Retrieves the list of available log entries for a build',
    inputSchema: toJsonSchema(GetBuildLogsSchema),
  },
  {
    name: 'compare_builds',
    description:
      'Compares two builds to identify differences in execution and configuration',
    inputSchema: toJsonSchema(CompareBuildsSchema),
  },
  {
    name: 'get_build_changes',
    description: 'Retrieves source code changes associated with a build',
    inputSchema: toJsonSchema(GetBuildChangesSchema),
  },
  {
    name: 'search_failed_builds',
    description:
      'Searches historical failed builds based on filters such as definition, branch, and date range',
    inputSchema: toJsonSchema(SearchFailedBuildsSchema),
  },
  {
    name: 'get_last_successful_build',
    description:
      'Retrieves the most recent successful build for a pipeline definition',
    inputSchema: toJsonSchema(GetLastSuccessfulBuildSchema),
  },
  {
    name: 'compare_failed_successful_builds',
    description:
      'Compares a failed build against the last successful build to identify potential causes of failure',
    inputSchema: toJsonSchema(CompareFailedSuccessfulBuildsSchema),
  },
];
