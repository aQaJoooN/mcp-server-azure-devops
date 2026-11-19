import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';
import { BuildSummary } from '../types';

export async function getBuildDetails(
  connection: WebApi,
  projectId: string,
  buildId: number,
): Promise<BuildSummary> {
  try {
    const buildApi = await connection.getBuildApi();
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const url = new URL(
      `${encodeURIComponent(projectId)}/_apis/build/builds/${buildId}`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', apiVersion);

    const requestOptions = buildApi.createRequestOptions(
      'application/json',
      apiVersion,
    );
    const response = await buildApi.rest.get<BuildSummary | null>(
      url.toString(),
      requestOptions,
    );

    if (response.statusCode === 404 || !response.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Build ${buildId} not found in project ${projectId}`,
      );
    }

    return response.result;
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
        throw new AzureDevOpsResourceNotFoundError(`Build ${buildId} not found: ${error.message}`);
      }
    }
    throw new AzureDevOpsError(
      `Failed to get build details: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
