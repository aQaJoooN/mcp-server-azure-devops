import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';

export interface AgentPoolDetailsResult {
  definitionId: number;
  queue?: { id?: number; name?: string };
  pool?: {
    id?: number;
    name?: string;
    size?: number;
    isHosted?: boolean;
    poolType?: string;
  };
}

export async function getAgentPoolDetails(
  connection: WebApi,
  projectId: string,
  definitionId: number,
): Promise<AgentPoolDetailsResult> {
  try {
    const buildApi = await connection.getBuildApi();
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');

    // 1. Fetch the build definition
    const defUrl = new URL(
      `${encodeURIComponent(projectId)}/_apis/build/definitions/${definitionId}`,
      `${baseUrl}/`,
    );
    defUrl.searchParams.set('api-version', apiVersion);
    const requestOptions = buildApi.createRequestOptions('application/json', apiVersion);
    const defResponse = await buildApi.rest.get<Record<string, unknown> | null>(
      defUrl.toString(),
      requestOptions,
    );

    if (defResponse.statusCode === 404 || !defResponse.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Pipeline definition ${definitionId} not found in project ${projectId}`,
      );
    }

    const queue = defResponse.result.queue as Record<string, unknown> | undefined;
    const queuePool = queue?.pool as Record<string, unknown> | undefined;
    const queueId = (queue?.id ?? queuePool?.id) as number | undefined;

    if (!queueId) {
      return {
        definitionId,
        queue: {
          id: queue?.id as number | undefined,
          name: queue?.name as string | undefined,
        },
      };
    }

    // 2. Fetch the pool details
    const poolUrl = new URL(
      `_apis/distributedtask/pools/${queueId}`,
      `${baseUrl}/`,
    );
    poolUrl.searchParams.set('api-version', apiVersion);
    const poolResponse = await buildApi.rest.get<Record<string, unknown> | null>(
      poolUrl.toString(),
      requestOptions,
    );

    const pool = poolResponse.result;

    return {
      definitionId,
      queue: {
        id: queue?.id as number | undefined,
        name: queue?.name as string | undefined,
      },
      pool: pool
        ? {
            id: pool.id as number | undefined,
            name: pool.name as string | undefined,
            size: pool.size as number | undefined,
            isHosted: pool.isHosted as boolean | undefined,
            poolType: pool.poolType as string | undefined,
          }
        : undefined,
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
          `Pipeline definition ${definitionId} not found: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get agent pool details: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
