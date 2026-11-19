import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';
import { AgentJobRequest } from '../types';

export async function getAgentJobHistory(
  connection: WebApi,
  poolId: number,
  agentId: number,
  top = 25,
): Promise<AgentJobRequest[]> {
  try {
    const buildApi = await connection.getBuildApi();
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const url = new URL(
      `_apis/distributedtask/pools/${poolId}/jobrequests`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', apiVersion);
    url.searchParams.set('agentId', String(agentId));
    url.searchParams.set('completedRequestCount', String(top));

    const requestOptions = buildApi.createRequestOptions('application/json', apiVersion);
    const response = await buildApi.rest.get<{
      count: number;
      value: AgentJobRequest[];
    } | null>(url.toString(), requestOptions);

    if (response.statusCode === 404 || !response.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Agent ${agentId} or pool ${poolId} not found`,
      );
    }

    return response.result.value ?? [];
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
        throw new AzureDevOpsResourceNotFoundError(
          `Agent ${agentId} not found in pool ${poolId}: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get agent job history: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
