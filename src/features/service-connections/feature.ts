import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../shared/errors';
import { apiVersion, defaultProject } from '../../utils/environment';
import { z } from 'zod';
import { ListServiceConnectionsSchema } from './schema';

export type ListServiceConnectionsOptions = z.infer<
  typeof ListServiceConnectionsSchema
>;

export interface ServiceConnectionInfo {
  id: string;
  name: string;
  type?: string;
  description?: string;
  isShared?: boolean;
  isReady?: boolean;
  createdBy?: { displayName?: string; uniqueName?: string };
  authorization?: {
    scheme?: string;
    parameters?: Record<string, string>;
  };
}

export async function listServiceConnections(
  connection: WebApi,
  options: ListServiceConnectionsOptions,
): Promise<ServiceConnectionInfo[]> {
  try {
    const projectId = options.projectId ?? defaultProject;
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const encodedProject = encodeURIComponent(projectId);

    const url = new URL(
      `${encodedProject}/_apis/serviceendpoint/endpoints`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', apiVersion);
    if (options.type) {
      url.searchParams.set('type', options.type);
    }
    if (options.authSchemes && options.authSchemes.length > 0) {
      url.searchParams.set('authSchemes', options.authSchemes.join(','));
    }
    if (options.includeDetails) {
      url.searchParams.set('includeDetails', 'true');
    }

    // Use the core/build API client for the HTTP transport
    const buildApi = await connection.getBuildApi();
    const requestOptions = buildApi.createRequestOptions(
      'application/json',
      apiVersion,
    );

    const response = await buildApi.rest.get<{
      count: number;
      value: ServiceConnectionInfo[];
    } | null>(url.toString(), requestOptions);

    if (response.statusCode === 404 || !response.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Service connections not found in project ${projectId}`,
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
          `Service connections not found in project ${options.projectId}: ${error.message}`,
        );
      }
    }

    throw new AzureDevOpsError(
      `Failed to list service connections: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
