import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';

export interface VariableGroupEntry {
  id?: number;
  name?: string;
  description?: string;
  type?: string;
  variables?: Record<string, { value?: string; isSecret?: boolean }>;
  createdBy?: { displayName?: string };
  createdOn?: string;
  modifiedBy?: { displayName?: string };
  modifiedOn?: string;
}

export async function getVariableGroups(
  connection: WebApi,
  projectId: string,
  groupName?: string,
  top = 50,
): Promise<VariableGroupEntry[]> {
  try {
    const buildApi = await connection.getBuildApi();
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const url = new URL(
      `${encodeURIComponent(projectId)}/_apis/distributedtask/variablegroups`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', apiVersion);
    url.searchParams.set('$top', String(top));
    if (groupName) url.searchParams.set('groupName', groupName);

    const requestOptions = buildApi.createRequestOptions(
      'application/json',
      apiVersion,
    );
    const response = await buildApi.rest.get<{
      count: number;
      value: VariableGroupEntry[];
    } | null>(url.toString(), requestOptions);

    if (response.statusCode === 404 || !response.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Variable groups not found in project ${projectId}`,
      );
    }

    // Sanitize secrets
    const groups = response.result.value ?? [];
    return groups.map((group) => {
      if (!group.variables) return group;
      const sanitized: Record<string, { value?: string; isSecret?: boolean }> =
        {};
      for (const [key, variable] of Object.entries(group.variables)) {
        if (variable.isSecret) {
          sanitized[key] = { isSecret: true, value: '<secret>' };
        } else {
          sanitized[key] = variable;
        }
      }
      return { ...group, variables: sanitized };
    });
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
          `Variable groups not found in project ${projectId}: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get variable groups: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
