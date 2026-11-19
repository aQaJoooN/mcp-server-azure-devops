import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';
import { BuildSummary } from '../types';

export async function searchFailedBuilds(
  connection: WebApi,
  projectId: string,
  definitionId?: number,
  branchName?: string,
  top?: number,
  minTime?: string,
  maxTime?: string,
): Promise<BuildSummary[]> {
  try {
    const buildApi = await connection.getBuildApi();
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const url = new URL(
      `${encodeURIComponent(projectId)}/_apis/build/builds`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', apiVersion);
    url.searchParams.set('statusFilter', 'completed');
    url.searchParams.set('resultFilter', 'failed');
    url.searchParams.set('$top', String(top ?? 25));
    if (definitionId) url.searchParams.set('definitions', String(definitionId));
    if (branchName) url.searchParams.set('branchName', branchName);
    if (minTime) url.searchParams.set('minTime', minTime);
    if (maxTime) url.searchParams.set('maxTime', maxTime);

    const requestOptions = buildApi.createRequestOptions(
      'application/json',
      apiVersion,
    );
    const response = await buildApi.rest.get<{
      count: number;
      value: BuildSummary[];
    } | null>(url.toString(), requestOptions);

    return response.result?.value ?? [];
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
    }
    throw new AzureDevOpsError(
      `Failed to search failed builds: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
