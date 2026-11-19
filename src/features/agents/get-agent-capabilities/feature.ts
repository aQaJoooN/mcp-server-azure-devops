import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { getAgentDetails } from '../get-agent-details/feature';

export interface AgentCapabilities {
  agentId: number;
  agentName?: string;
  systemCapabilities: Record<string, string>;
  userCapabilities: Record<string, string>;
}

export async function getAgentCapabilities(
  connection: WebApi,
  poolId: number,
  agentId: number,
): Promise<AgentCapabilities> {
  try {
    const agent = await getAgentDetails(connection, poolId, agentId, true);
    return {
      agentId: agent.id,
      agentName: agent.name,
      systemCapabilities: agent.systemCapabilities ?? {},
      userCapabilities: agent.userCapabilities ?? {},
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
      `Failed to get agent capabilities: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
