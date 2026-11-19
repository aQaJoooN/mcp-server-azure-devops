export * from './types';
export * from './get-agent-details';
export * from './get-agent-capabilities';
export * from './get-agent-job-history';
export * from './get-agent-pool-status';
export * from './get-agent-image-version';
export * from './get-agent-environment-summary';
export * from './tool-definitions';

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { WebApi } from 'azure-devops-node-api';
import {
  RequestIdentifier,
  RequestHandler,
} from '../../shared/types/request-handler';

import { GetAgentDetailsSchema } from './get-agent-details/schema';
import { GetAgentCapabilitiesSchema } from './get-agent-capabilities/schema';
import { GetAgentJobHistorySchema } from './get-agent-job-history/schema';
import { GetAgentPoolStatusSchema } from './get-agent-pool-status/schema';
import { GetAgentImageVersionSchema } from './get-agent-image-version/schema';
import { GetAgentEnvironmentSummarySchema } from './get-agent-environment-summary/schema';

import { getAgentDetails } from './get-agent-details/feature';
import { getAgentCapabilities } from './get-agent-capabilities/feature';
import { getAgentJobHistory } from './get-agent-job-history/feature';
import { getAgentPoolStatus } from './get-agent-pool-status/feature';
import { getAgentImageVersion } from './get-agent-image-version/feature';
import { getAgentEnvironmentSummary } from './get-agent-environment-summary/feature';

const AGENT_TOOL_NAMES = [
  'get_agent_details',
  'get_agent_capabilities',
  'get_agent_job_history',
  'get_agent_pool_status',
  'get_agent_image_version',
  'get_agent_environment_summary',
] as const;

export const isAgentsRequest: RequestIdentifier = (
  request: CallToolRequest,
): boolean => {
  return (AGENT_TOOL_NAMES as readonly string[]).includes(request.params.name);
};

export const handleAgentsRequest: RequestHandler = async (
  connection: WebApi,
  request: CallToolRequest,
): Promise<{ content: Array<{ type: string; text: string }> }> => {
  switch (request.params.name) {
    case 'get_agent_details': {
      const args = GetAgentDetailsSchema.parse(request.params.arguments);
      const result = await getAgentDetails(
        connection,
        args.poolId,
        args.agentId,
        args.includeCapabilities,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_agent_capabilities': {
      const args = GetAgentCapabilitiesSchema.parse(request.params.arguments);
      const result = await getAgentCapabilities(
        connection,
        args.poolId,
        args.agentId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_agent_job_history': {
      const args = GetAgentJobHistorySchema.parse(request.params.arguments);
      const result = await getAgentJobHistory(
        connection,
        args.poolId,
        args.agentId,
        args.top,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_agent_pool_status': {
      const args = GetAgentPoolStatusSchema.parse(request.params.arguments);
      const result = await getAgentPoolStatus(connection, args.poolId);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_agent_image_version': {
      const args = GetAgentImageVersionSchema.parse(request.params.arguments);
      const result = await getAgentImageVersion(
        connection,
        args.poolId,
        args.agentId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_agent_environment_summary': {
      const args = GetAgentEnvironmentSummarySchema.parse(
        request.params.arguments,
      );
      const result = await getAgentEnvironmentSummary(
        connection,
        args.poolId,
        args.agentId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    default:
      throw new Error(`Unknown agents tool: ${request.params.name}`);
  }
};
