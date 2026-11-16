import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../shared/errors';
import { apiVersion, defaultProject } from '../../utils/environment';
import { z } from 'zod';
import { ListLibrariesSchema } from './schema';

export type ListLibrariesOptions = z.infer<typeof ListLibrariesSchema>;

export interface VariableGroupInfo {
  id: number;
  name: string;
  type?: string;
  description?: string;
  createdBy?: { displayName?: string; uniqueName?: string };
  createdOn?: string;
  modifiedBy?: { displayName?: string; uniqueName?: string };
  modifiedOn?: string;
  variableCount?: number;
  variables?: Record<
    string,
    { value?: string; isSecret?: boolean; isReadOnly?: boolean }
  >;
}

export async function listLibraries(
  connection: WebApi,
  options: ListLibrariesOptions,
): Promise<VariableGroupInfo[]> {
  try {
    const projectId = options.projectId ?? defaultProject;
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const encodedProject = encodeURIComponent(projectId);

    const url = new URL(
      `${encodedProject}/_apis/distributedtask/variablegroups`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', apiVersion);
    if (options.groupName) {
      url.searchParams.set('groupName', options.groupName);
    }
    if (options.top) {
      url.searchParams.set('$top', options.top.toString());
    }

    const taskAgentApi = await connection.getTaskAgentApi();
    const requestOptions = taskAgentApi.createRequestOptions(
      'application/json',
      apiVersion,
    );

    const response = await taskAgentApi.rest.get<{
      count: number;
      value: VariableGroupInfo[];
    } | null>(url.toString(), requestOptions);

    if (response.statusCode === 404 || !response.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Variable groups (libraries) not found in project ${projectId}`,
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
          `Libraries not found in project ${options.projectId}: ${error.message}`,
        );
      }
    }

    throw new AzureDevOpsError(
      `Failed to list libraries: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
