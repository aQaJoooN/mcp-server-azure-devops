import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';

export interface PipelineResourcesResult {
  definitionId: number;
  name?: string;
  primaryRepository?: {
    id?: string;
    name?: string;
    type?: string;
    defaultBranch?: string;
    url?: string;
  };
  resources?: {
    repositories?: unknown[];
    pipelines?: unknown[];
  };
}

export async function getPipelineResources(
  connection: WebApi,
  projectId: string,
  definitionId: number,
): Promise<PipelineResourcesResult> {
  try {
    const buildApi = await connection.getBuildApi();
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const url = new URL(
      `${encodeURIComponent(projectId)}/_apis/build/definitions/${definitionId}`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', apiVersion);

    const requestOptions = buildApi.createRequestOptions('application/json', apiVersion);
    const response = await buildApi.rest.get<Record<string, unknown> | null>(
      url.toString(),
      requestOptions,
    );

    if (response.statusCode === 404 || !response.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Pipeline definition ${definitionId} not found in project ${projectId}`,
      );
    }

    const definition = response.result;
    const repo = definition.repository as Record<string, unknown> | undefined;
    const process = definition.process as Record<string, unknown> | undefined;

    const primaryRepository = repo
      ? {
          id: repo.id as string | undefined,
          name: repo.name as string | undefined,
          type: repo.type as string | undefined,
          defaultBranch: repo.defaultBranch as string | undefined,
          url: repo.url as string | undefined,
        }
      : undefined;

    // Try to extract resources from process or top-level
    const rawResources =
      (process?.resources as Record<string, unknown> | undefined) ??
      (definition.resources as Record<string, unknown> | undefined);

    return {
      definitionId,
      name: definition.name as string | undefined,
      primaryRepository,
      resources: rawResources
        ? {
            repositories: (rawResources.repositories as unknown[]) ?? [],
            pipelines: (rawResources.pipelines as unknown[]) ?? [],
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
      `Failed to get pipeline resources: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
