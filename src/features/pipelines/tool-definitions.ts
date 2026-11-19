import { toJsonSchema } from '../../shared/utils/to-json-schema';
import { ToolDefinition } from '../../shared/types/tool-definition';
import { ListPipelinesSchema } from './list-pipelines/schema';
import { GetPipelineSchema } from './get-pipeline/schema';
import { ListPipelineRunsSchema } from './list-pipeline-runs/schema';
import { GetPipelineRunSchema } from './get-pipeline-run/schema';
import { DownloadPipelineArtifactSchema } from './download-pipeline-artifact/schema';
import { GetPipelineTimelineSchema } from './pipeline-timeline/schema';
import { GetPipelineLogSchema } from './get-pipeline-log/schema';
import { TriggerPipelineSchema } from './trigger-pipeline/schema';
import { GetPipelineRunYamlSchema } from './get-pipeline-run-yaml/schema';
import { GetPipelineRunSourcesSchema } from './get-pipeline-run-sources/schema';
import { GetPipelineRunStageTasksSchema } from './get-pipeline-run-stage-tasks/schema';
import { GetPipelineDefinitionSchema } from './get-pipeline-definition/schema';
import { GetPipelineYamlSchema } from './get-pipeline-yaml/schema';
import { GetPipelineTemplateSchema } from './get-pipeline-template/schema';
import { GetVariableGroupsSchema } from './get-variable-groups/schema';
import { GetPipelineResourcesSchema } from './get-pipeline-resources/schema';
import { GetAgentPoolDetailsSchema } from './get-agent-pool-details/schema';

/**
 * List of pipelines tools
 */
export const pipelinesTools: ToolDefinition[] = [
  {
    name: 'list_pipelines',
    description: 'List pipelines in a project',
    inputSchema: toJsonSchema(ListPipelinesSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_pipeline',
    description: 'Get details of a specific pipeline',
    inputSchema: toJsonSchema(GetPipelineSchema),
    mcp_enabled: true,
  },
  {
    name: 'list_pipeline_runs',
    description: 'List recent runs for a pipeline',
    inputSchema: toJsonSchema(ListPipelineRunsSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_pipeline_run',
    description: 'Get details for a specific pipeline run',
    inputSchema: toJsonSchema(GetPipelineRunSchema),
    mcp_enabled: true,
  },
  {
    name: 'download_pipeline_artifact',
    description:
      'Download a file from a pipeline run artifact and return its textual content',
    inputSchema: toJsonSchema(DownloadPipelineArtifactSchema),
    mcp_enabled: true,
  },
  {
    name: 'pipeline_timeline',
    description:
      'Retrieve the timeline of stages and jobs for a pipeline run, to reduce the amount of data returned, you can filter by state and result',
    inputSchema: toJsonSchema(GetPipelineTimelineSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_pipeline_log',
    description:
      'Retrieve a specific pipeline log using the timeline log identifier',
    inputSchema: toJsonSchema(GetPipelineLogSchema),
    mcp_enabled: true,
  },
  {
    name: 'trigger_pipeline',
    description: 'Trigger a pipeline run',
    inputSchema: toJsonSchema(TriggerPipelineSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_pipeline_run_yaml',
    description:
      'Get the final expanded YAML of a pipeline run (the YAML that was actually executed, after template expansion)',
    inputSchema: toJsonSchema(GetPipelineRunYamlSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_pipeline_run_sources',
    description:
      'Get the source repositories and their versions/branches that were used in a specific pipeline run',
    inputSchema: toJsonSchema(GetPipelineRunSourcesSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_pipeline_run_stage_tasks',
    description:
      'Get the tasks (steps) for each job within each stage of a pipeline run, with optional stage/job name filters. Returns logId for each task so you can fetch logs with get_pipeline_log.',
    inputSchema: toJsonSchema(GetPipelineRunStageTasksSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_pipeline_definition',
    description:
      'Retrieves pipeline definition settings and configuration (name, path, triggers, variables, repository)',
    inputSchema: toJsonSchema(GetPipelineDefinitionSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_pipeline_yaml',
    description:
      'Retrieves the main pipeline YAML file content from the repository linked to the pipeline definition',
    inputSchema: toJsonSchema(GetPipelineYamlSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_pipeline_template',
    description:
      'Retrieves a YAML template file referenced by a pipeline from a repository',
    inputSchema: toJsonSchema(GetPipelineTemplateSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_variable_groups',
    description:
      'Retrieves variable group metadata and configuration; secret values are masked',
    inputSchema: toJsonSchema(GetVariableGroupsSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_pipeline_resources',
    description:
      'Retrieves pipeline resource dependencies, including the primary repository and declared pipeline resources',
    inputSchema: toJsonSchema(GetPipelineResourcesSchema),
    mcp_enabled: true,
  },
  {
    name: 'get_agent_pool_details',
    description:
      'Retrieves the agent pool configuration associated with a pipeline definition',
    inputSchema: toJsonSchema(GetAgentPoolDetailsSchema),
    mcp_enabled: true,
  },
];
