import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';
import { AgentInfo } from '../types';

export async function getAgentDetails(
  connection: WebApi,
  poolId: number,
  agentId: number,
  includeCapabilities = false,
): Promise<AgentInfo> {
  try {
    const buildApi = await connection.getBuildApi();
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const url = new URL(
      `_apis/distributedtask/pools/${poolId}/agents/${agentId}`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', apiVersion);
    url.searchParams.set('includeCapabilities', String(includeCapabilities));

    const requestOptions = buildApi.createRequestOptions(
      'application/json',
      apiVersion,
    );
    const response = await buildApi.rest.get<AgentInfo | null>(
      url.toString(),
      requestOptions,
    );

    if (response.statusCode === 404 || !response.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Agent ${agentId} not found in pool ${poolId}`,
      );
    }

    return response.result;
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
      `Failed to get agent details: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
