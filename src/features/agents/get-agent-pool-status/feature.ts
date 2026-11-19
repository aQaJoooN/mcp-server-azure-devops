import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';
import { AgentInfo, AgentPoolInfo } from '../types';

export interface AgentPoolStatusResult {
  pool: AgentPoolInfo;
  agents: Pick<AgentInfo, 'id' | 'name' | 'status' | 'enabled' | 'version'>[];
  summary: {
    total: number;
    online: number;
    offline: number;
    enabled: number;
    disabled: number;
  };
}

export async function getAgentPoolStatus(
  connection: WebApi,
  poolId: number,
): Promise<AgentPoolStatusResult> {
  try {
    const buildApi = await connection.getBuildApi();
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');

    const poolUrl = new URL(
      `_apis/distributedtask/pools/${poolId}`,
      `${baseUrl}/`,
    );
    poolUrl.searchParams.set('api-version', apiVersion);

    const agentsUrl = new URL(
      `_apis/distributedtask/pools/${poolId}/agents`,
      `${baseUrl}/`,
    );
    agentsUrl.searchParams.set('api-version', apiVersion);
    agentsUrl.searchParams.set('includeCapabilities', 'false');

    const requestOptions = buildApi.createRequestOptions('application/json', apiVersion);

    const [poolResponse, agentsResponse] = await Promise.all([
      buildApi.rest.get<AgentPoolInfo | null>(poolUrl.toString(), requestOptions),
      buildApi.rest.get<{ count: number; value: AgentInfo[] } | null>(
        agentsUrl.toString(),
        requestOptions,
      ),
    ]);

    if (poolResponse.statusCode === 404 || !poolResponse.result) {
      throw new AzureDevOpsResourceNotFoundError(`Pool ${poolId} not found`);
    }

    const pool = poolResponse.result;
    const agents = agentsResponse.result?.value ?? [];

    const summary = {
      total: agents.length,
      online: agents.filter((a) => a.status?.toLowerCase() === 'online').length,
      offline: agents.filter((a) => a.status?.toLowerCase() === 'offline').length,
      enabled: agents.filter((a) => a.enabled !== false).length,
      disabled: agents.filter((a) => a.enabled === false).length,
    };

    return {
      pool,
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        enabled: a.enabled,
        version: a.version,
      })),
      summary,
    };
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
        throw new AzureDevOpsResourceNotFoundError(
          `Pool ${poolId} not found: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get agent pool status: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
