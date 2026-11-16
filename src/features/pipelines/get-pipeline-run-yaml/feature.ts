import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion, defaultProject } from '../../../utils/environment';
import { z } from 'zod';
import { GetPipelineRunYamlSchema } from './schema';

export type GetPipelineRunYamlOptions = z.infer<typeof GetPipelineRunYamlSchema>;

const API_VERSION = apiVersion;

/**
 * Fetches the final YAML for a specific pipeline run.
 *
 * Azure DevOps stores the expanded pipeline YAML as the "finalYaml" on the
 * Pipelines API run object. This is the YAML that was actually executed,
 * after template expansion.
 */
export async function getPipelineRunYaml(
  connection: WebApi,
  options: GetPipelineRunYamlOptions,
): Promise<string> {
  try {
    const pipelinesApi = await connection.getPipelinesApi();
    const projectId = options.projectId ?? defaultProject;
    const { pipelineId, runId } = options;

    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const encodedProject = encodeURIComponent(projectId);

    // The Pipelines REST API exposes the final YAML on the run via ?$expand=finalYaml
    const url = new URL(
      `${encodedProject}/_apis/pipelines/${pipelineId}/runs/${runId}`,
      `${baseUrl}/`,
    );
    url.searchParams.set('api-version', API_VERSION);
    url.searchParams.set('$expand', 'finalYaml');

    const requestOptions = pipelinesApi.createRequestOptions(
      'application/json',
      API_VERSION,
    );

    const response = await pipelinesApi.rest.get<{
      finalYaml?: string;
      id?: number;
      name?: string;
    } | null>(url.toString(), requestOptions);

    if (response.statusCode === 404 || !response.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Pipeline run ${runId} not found in project ${projectId}`,
      );
    }

    const finalYaml = response.result.finalYaml;
    if (!finalYaml) {
      return `# No finalYaml available for pipeline ${pipelineId} run ${runId}\n# The run may still be in progress or the pipeline version may not expose YAML.`;
    }

    return finalYaml;
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
          `Pipeline run YAML not found: ${error.message}`,
        );
      }
    }

    throw new AzureDevOpsError(
      `Failed to get pipeline run YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
