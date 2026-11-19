import { toJsonSchema } from '../../shared/utils/to-json-schema';
import { ToolDefinition } from '../../shared/types/tool-definition';
import { GetAgentDetailsSchema } from './get-agent-details/schema';
import { GetAgentCapabilitiesSchema } from './get-agent-capabilities/schema';
import { GetAgentJobHistorySchema } from './get-agent-job-history/schema';
import { GetAgentPoolStatusSchema } from './get-agent-pool-status/schema';
import { GetAgentImageVersionSchema } from './get-agent-image-version/schema';
import { GetAgentEnvironmentSummarySchema } from './get-agent-environment-summary/schema';

export const agentsTools: ToolDefinition[] = [
  {
    name: 'get_agent_details',
    description:
      'Retrieves agent information, status, and configuration from an agent pool',
    inputSchema: toJsonSchema(GetAgentDetailsSchema),
  },
  {
    name: 'get_agent_capabilities',
    description:
      'Retrieves installed tools, software versions, and agent capabilities',
    inputSchema: toJsonSchema(GetAgentCapabilitiesSchema),
  },
  {
    name: 'get_agent_job_history',
    description: 'Retrieves historical jobs executed by a specific agent',
    inputSchema: toJsonSchema(GetAgentJobHistorySchema),
  },
  {
    name: 'get_agent_pool_status',
    description:
      'Retrieves agent pool availability, capacity, and operational status',
    inputSchema: toJsonSchema(GetAgentPoolStatusSchema),
  },
  {
    name: 'get_agent_image_version',
    description:
      'Retrieves the container image name, tag, and version used by Kubernetes-based agents',
    inputSchema: toJsonSchema(GetAgentImageVersionSchema),
  },
  {
    name: 'get_agent_environment_summary',
    description:
      'Retrieves a sanitized summary of the agent environment and runtime configuration (secrets excluded)',
    inputSchema: toJsonSchema(GetAgentEnvironmentSummarySchema),
  },
];
