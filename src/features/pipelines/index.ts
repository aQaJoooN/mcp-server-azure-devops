// Re-export types
export * from './types';

// Re-export features
export * from './list-pipelines';
export * from './get-pipeline';
export * from './list-pipeline-runs';
export * from './get-pipeline-run';
export * from './download-pipeline-artifact';
export * from './pipeline-timeline';
export * from './get-pipeline-log';
export * from './trigger-pipeline';
export * from './get-pipeline-run-yaml';
export * from './get-pipeline-run-sources';
export * from './get-pipeline-run-stage-tasks';
export * from './get-pipeline-definition';
export * from './get-pipeline-yaml';
export * from './get-pipeline-template';
export * from './get-variable-groups';
export * from './get-pipeline-resources';
export * from './get-agent-pool-details';

// Export tool definitions
export * from './tool-definitions';

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { WebApi } from 'azure-devops-node-api';
import {
  RequestIdentifier,
  RequestHandler,
} from '../../shared/types/request-handler';
import { ListPipelinesSchema } from './list-pipelines';
import { GetPipelineSchema } from './get-pipeline';
import { ListPipelineRunsSchema } from './list-pipeline-runs';
import { GetPipelineRunSchema } from './get-pipeline-run';
import { DownloadPipelineArtifactSchema } from './download-pipeline-artifact';
import { GetPipelineTimelineSchema } from './pipeline-timeline';
import { GetPipelineLogSchema } from './get-pipeline-log';
import { TriggerPipelineSchema } from './trigger-pipeline';
import { listPipelines } from './list-pipelines';
import { getPipeline } from './get-pipeline';
import { listPipelineRuns } from './list-pipeline-runs';
import { getPipelineRun } from './get-pipeline-run';
import { downloadPipelineArtifact } from './download-pipeline-artifact';
import { getPipelineTimeline } from './pipeline-timeline';
import { getPipelineLog } from './get-pipeline-log';
import { triggerPipeline } from './trigger-pipeline';
import { GetPipelineRunYamlSchema } from './get-pipeline-run-yaml/schema';
import { getPipelineRunYaml } from './get-pipeline-run-yaml/feature';
import { GetPipelineRunSourcesSchema } from './get-pipeline-run-sources/schema';
import { getPipelineRunSources } from './get-pipeline-run-sources/feature';
import { GetPipelineRunStageTasksSchema } from './get-pipeline-run-stage-tasks/schema';
import { getPipelineRunStageTasks } from './get-pipeline-run-stage-tasks/feature';
import { GetPipelineDefinitionSchema } from './get-pipeline-definition/schema';
import { getPipelineDefinition } from './get-pipeline-definition/feature';
import { GetPipelineYamlSchema } from './get-pipeline-yaml/schema';
import { getPipelineYaml } from './get-pipeline-yaml/feature';
import { GetPipelineTemplateSchema } from './get-pipeline-template/schema';
import { getPipelineTemplate } from './get-pipeline-template/feature';
import { GetVariableGroupsSchema } from './get-variable-groups/schema';
import { getVariableGroups } from './get-variable-groups/feature';
import { GetPipelineResourcesSchema } from './get-pipeline-resources/schema';
import { getPipelineResources } from './get-pipeline-resources/feature';
import { GetAgentPoolDetailsSchema } from './get-agent-pool-details/schema';
import { getAgentPoolDetails } from './get-agent-pool-details/feature';

/**
 * Checks if the request is for the pipelines feature
 */
export const isPipelinesRequest: RequestIdentifier = (
  request: CallToolRequest,
): boolean => {
  const toolName = request.params.name;
  return [
    'list_pipelines',
    'get_pipeline',
    'list_pipeline_runs',
    'get_pipeline_run',
    'download_pipeline_artifact',
    'pipeline_timeline',
    'get_pipeline_log',
    'trigger_pipeline',
    'get_pipeline_run_yaml',
    'get_pipeline_run_sources',
    'get_pipeline_run_stage_tasks',
    'get_pipeline_definition',
    'get_pipeline_yaml',
    'get_pipeline_template',
    'get_variable_groups',
    'get_pipeline_resources',
    'get_agent_pool_details',
  ].includes(toolName);
};

/**
 * Handles pipelines feature requests
 */
export const handlePipelinesRequest: RequestHandler = async (
  connection: WebApi,
  request: CallToolRequest,
): Promise<{ content: Array<{ type: string; text: string }> }> => {
  switch (request.params.name) {
    case 'list_pipelines': {
      const args = ListPipelinesSchema.parse(request.params.arguments);
      const result = await listPipelines(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_pipeline': {
      const args = GetPipelineSchema.parse(request.params.arguments);
      const result = await getPipeline(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'list_pipeline_runs': {
      const args = ListPipelineRunsSchema.parse(request.params.arguments);
      const result = await listPipelineRuns(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_pipeline_run': {
      const args = GetPipelineRunSchema.parse(request.params.arguments);
      const result = await getPipelineRun(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'download_pipeline_artifact': {
      const args = DownloadPipelineArtifactSchema.parse(
        request.params.arguments,
      );
      const result = await downloadPipelineArtifact(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'pipeline_timeline': {
      const args = GetPipelineTimelineSchema.parse(request.params.arguments);
      const result = await getPipelineTimeline(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_pipeline_log': {
      const args = GetPipelineLogSchema.parse(request.params.arguments);
      const result = await getPipelineLog(connection, {
        ...args,
        projectId: args.projectId,
      });
      const text =
        typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return {
        content: [{ type: 'text', text }],
      };
    }
    case 'trigger_pipeline': {
      const args = TriggerPipelineSchema.parse(request.params.arguments);
      const result = await triggerPipeline(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_pipeline_run_yaml': {
      const args = GetPipelineRunYamlSchema.parse(request.params.arguments);
      const result = await getPipelineRunYaml(connection, {
        ...args,
        projectId: args.projectId,
      });
      // Format as readable text with all resolved files
      let output = `# Pipeline YAML Resolution\n`;
      output += `# Run ID: ${result.runId}\n`;
      if (result.pipelineId) output += `# Pipeline ID: ${result.pipelineId}\n`;
      output += `# Pipeline Path: ${result.pipelinePath}\n`;
      output += `# Files Resolved: ${result.files.length}\n`;
      output += `\n`;
      for (let i = 0; i < result.files.length; i++) {
        const f = result.files[i];
        output += `\n${'='.repeat(80)}\n`;
        output += `# File ${i + 1}/${result.files.length}: ${f.label}\n`;
        output += `# Repo: ${f.repositoryName} | Ref: ${f.ref} | Path: ${f.path}\n`;
        output += `${'='.repeat(80)}\n`;
        output += f.content;
        if (!f.content.endsWith('\n')) output += '\n';
      }
      return {
        content: [{ type: 'text', text: output }],
      };
    }
    case 'get_pipeline_run_sources': {
      const args = GetPipelineRunSourcesSchema.parse(request.params.arguments);
      const result = await getPipelineRunSources(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_pipeline_run_stage_tasks': {
      const args = GetPipelineRunStageTasksSchema.parse(
        request.params.arguments,
      );
      const result = await getPipelineRunStageTasks(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_pipeline_definition': {
      const args = GetPipelineDefinitionSchema.parse(request.params.arguments);
      const result = await getPipelineDefinition(
        connection,
        args.projectId,
        args.definitionId,
        args.revision,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_pipeline_yaml': {
      const args = GetPipelineYamlSchema.parse(request.params.arguments);
      const result = await getPipelineYaml(connection, args.projectId, args.definitionId);
      if (result.content !== undefined) {
        return { content: [{ type: 'text', text: result.content }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'get_pipeline_template': {
      const args = GetPipelineTemplateSchema.parse(request.params.arguments);
      const result = await getPipelineTemplate(
        connection,
        args.projectId,
        args.repositoryId,
        args.templatePath,
        args.branchName,
      );
      return { content: [{ type: 'text', text: result.content }] };
    }
    case 'get_variable_groups': {
      const args = GetVariableGroupsSchema.parse(request.params.arguments);
      const result = await getVariableGroups(
        connection,
        args.projectId,
        args.groupName,
        args.top,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_pipeline_resources': {
      const args = GetPipelineResourcesSchema.parse(request.params.arguments);
      const result = await getPipelineResources(
        connection,
        args.projectId,
        args.definitionId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_agent_pool_details': {
      const args = GetAgentPoolDetailsSchema.parse(request.params.arguments);
      const result = await getAgentPoolDetails(
        connection,
        args.projectId,
        args.definitionId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    default:
      throw new Error(`Unknown pipelines tool: ${request.params.name}`);
  }
};
