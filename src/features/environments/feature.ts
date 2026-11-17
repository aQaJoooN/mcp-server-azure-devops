import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../shared/errors';
import { apiVersion } from '../../utils/environment';
import { z } from 'zod';
import { ListEnvironmentsSchema } from './schema';

export type ListEnvironmentsOptions = z.infer<typeof ListEnvironmentsSchema>;

export interface EnvironmentInfo {
  id: number;
  name: string;
  description?: string;
  createdBy?: { displayName?: string; uniqueName?: string };
  createdOn?: string;
  lastModifiedBy?: { displayName?: string; uniqueName?: string };
  lastModifiedOn?: string;
  project?: { id?: string; name?: string };
}

export async function listEnvironments(
  connection: WebApi,
  options: ListEnvironmentsOptions,
): Promise<EnvironmentInfo[]> {
  try {
    const projectId = options.projectId;
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const encodedProject = encodeURIComponent(projectId);

    const url = new URL(
      `${encodedProject}/_apis/distributedtask/environments`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', apiVersion);
    if (options.top) {
      url.searchParams.set('$top', options.top.toString());
    }
    if (options.continuationToken != null) {
      url.searchParams.set(
        'continuationToken',
        options.continuationToken.toString(),
      );
    }

    // Use task agent API client for the HTTP client
    const taskAgentApi = await connection.getTaskAgentApi();
    const requestOptions = taskAgentApi.createRequestOptions(
      'application/json',
      apiVersion,
    );

    const response = await taskAgentApi.rest.get<{
      count: number;
      value: EnvironmentInfo[];
    } | null>(url.toString(), requestOptions);

    if (response.statusCode === 404 || !response.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Environments not found in project ${projectId}`,
      );
    }

    return response.result.value ?? [];
  } catch (error) {
    if (error instanceof AzureDevOpsError) {
      throw error;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes('authentication') ||
        message.includes('unauthorized') ||
        message.includes('401')
      ) {
        throw new AzureDevOpsAuthenticationError(
          `Failed to authenticate: ${error.message}`,
        );
      }
      if (
        message.includes('not found') ||
        message.includes('does not exist') ||
        message.includes('404')
      ) {
        throw new AzureDevOpsResourceNotFoundError(
          `Environments not found in project ${options.projectId}: ${error.message}`,
        );
      }
    }

    throw new AzureDevOpsError(
      `Failed to list environments: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
