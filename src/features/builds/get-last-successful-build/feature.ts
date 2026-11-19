import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';
import { BuildSummary } from '../types';

export async function getLastSuccessfulBuild(
  connection: WebApi,
  projectId: string,
  definitionId: number,
  branchName?: string,
): Promise<BuildSummary | null> {
  try {
    const buildApi = await connection.getBuildApi();
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const url = new URL(
      `${encodeURIComponent(projectId)}/_apis/build/builds`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', apiVersion);
    url.searchParams.set('statusFilter', 'completed');
    url.searchParams.set('resultFilter', 'succeeded');
    url.searchParams.set('definitions', String(definitionId));
    url.searchParams.set('$top', '1');
    if (branchName) url.searchParams.set('branchName', branchName);

    const requestOptions = buildApi.createRequestOptions(
      'application/json',
      apiVersion,
    );
    const response = await buildApi.rest.get<{
      count: number;
      value: BuildSummary[];
    } | null>(url.toString(), requestOptions);

    const builds = response.result?.value ?? [];
    return builds.length > 0 ? builds[0] : null;
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
    }
    throw new AzureDevOpsError(
      `Failed to get last successful build: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
