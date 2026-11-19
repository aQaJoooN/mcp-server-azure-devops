import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { getAgentDetails } from '../get-agent-details/feature';

export interface AgentEnvironmentSummary {
  agentId: number;
  agentName?: string;
  status?: string;
  version?: string;
  osDescription?: string;
  systemCapabilities: Record<string, string>;
  userCapabilities: Record<string, string>;
}

const SECRET_KEYWORDS = [
  'token',
  'secret',
  'password',
  'key',
  'pat',
  'credential',
];

function isSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_KEYWORDS.some((kw) => lower.includes(kw));
}

function sanitize(
  caps: Record<string, string> | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(caps ?? {})) {
    if (!isSensitive(key)) {
      result[key] = value;
    }
  }
  return result;
}

export async function getAgentEnvironmentSummary(
  connection: WebApi,
  poolId: number,
  agentId: number,
): Promise<AgentEnvironmentSummary> {
  try {
    const agent = await getAgentDetails(connection, poolId, agentId, true);

    return {
      agentId: agent.id,
      agentName: agent.name,
      status: agent.status,
      version: agent.version,
      osDescription: agent.osDescription,
      systemCapabilities: sanitize(agent.systemCapabilities),
      userCapabilities: sanitize(agent.userCapabilities),
    };
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('authentication') ||
        msg.includes('unauthorized') ||
        msg.includes('401')
      ) {
        throw new AzureDevOpsAuthenticationError(
          `Failed to authenticate: ${error.message}`,
        );
      }
      if (
        msg.includes('not found') ||
        msg.includes('does not exist') ||
        msg.includes('404')
      ) {
        throw new AzureDevOpsResourceNotFoundError(
          `Agent ${agentId} not found in pool ${poolId}: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get agent environment summary: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
