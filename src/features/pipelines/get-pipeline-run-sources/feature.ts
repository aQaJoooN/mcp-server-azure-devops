import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion, defaultProject } from '../../../utils/environment';
import { z } from 'zod';
import { GetPipelineRunSourcesSchema } from './schema';

export type GetPipelineRunSourcesOptions = z.infer<
  typeof GetPipelineRunSourcesSchema
>;

export interface PipelineRunResource {
  alias: string;
  type: string;
  version?: string;
  branch?: string;
  commitId?: string;
  repoType?: string;
  repositoryId?: string;
  repositoryName?: string;
  definitionId?: number;
  definitionName?: string;
}

export interface PipelineRunSources {
  runId: number;
  resources: PipelineRunResource[];
}

const API_VERSION = apiVersion;

/**
 * Returns the source repositories and their versions/branches used in a
 * pipeline run.  Azure DevOps exposes this under `resources` on the run
 * object when expanded with `$expand=resources`.
 */
export async function getPipelineRunSources(
  connection: WebApi,
  options: GetPipelineRunSourcesOptions,
): Promise<PipelineRunSources> {
  try {
    const pipelinesApi = await connection.getPipelinesApi();
    const projectId = options.projectId ?? defaultProject;
    const { runId } = options;

    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const encodedProject = encodeURIComponent(projectId);

    // Try pipeline-scoped URL first if we have a pipelineId
    const urls: string[] = [];
    if (options.pipelineId) {
      const u1 = new URL(
        `${encodedProject}/_apis/pipelines/${options.pipelineId}/runs/${runId}`,
        `${baseUrl}/`,
      );
      u1.searchParams.set('api-version', API_VERSION);
      u1.searchParams.set('$expand', 'resources');
      urls.push(u1.toString());
    }
    const u2 = new URL(
      `${encodedProject}/_apis/pipelines/runs/${runId}`,
      `${baseUrl}/`,
    );
    u2.searchParams.set('api-version', API_VERSION);
    u2.searchParams.set('$expand', 'resources');
    urls.push(u2.toString());

    const requestOptions = pipelinesApi.createRequestOptions(
      'application/json',
      API_VERSION,
    );

    let raw: Record<string, unknown> | null = null;
    for (const urlStr of urls) {
      const response = await pipelinesApi.rest.get<Record<
        string,
        unknown
      > | null>(urlStr, requestOptions);
      if (response.statusCode !== 404 && response.result) {
        raw = response.result;
        break;
      }
    }

    if (!raw) {
      throw new AzureDevOpsResourceNotFoundError(
        `Pipeline run ${runId} not found in project ${projectId}`,
      );
    }

    const resources: PipelineRunResource[] = [];
    const rawResources = raw.resources as Record<string, unknown> | undefined;
    if (rawResources && typeof rawResources === 'object') {
      // repositories section
      const repos = rawResources.repositories as
        | Record<string, unknown>
        | undefined;
      if (repos && typeof repos === 'object') {
        for (const [alias, repo] of Object.entries(repos)) {
          const r = repo as Record<string, unknown>;
          const ref = r.refName as string | undefined;
          resources.push({
            alias,
            type: 'repository',
            version: r.version as string | undefined,
            branch: ref ? ref.replace('refs/heads/', '') : undefined,
            commitId: r.version as string | undefined,
            repoType: (r.repository as Record<string, unknown> | undefined)
              ?.type as string | undefined,
            repositoryId: (r.repository as Record<string, unknown> | undefined)
              ?.id as string | undefined,
            repositoryName: (
              r.repository as Record<string, unknown> | undefined
            )?.name as string | undefined,
          });
        }
      }

      // pipelines section
      const pipelines = rawResources.pipelines as
        | Record<string, unknown>
        | undefined;
      if (pipelines && typeof pipelines === 'object') {
        for (const [alias, pipeline] of Object.entries(pipelines)) {
          const p = pipeline as Record<string, unknown>;
          resources.push({
            alias,
            type: 'pipeline',
            version: (p.run as Record<string, unknown> | undefined)?.id as
              | string
              | undefined,
            definitionId: (p.pipeline as Record<string, unknown> | undefined)
              ?.id as number | undefined,
            definitionName: (p.pipeline as Record<string, unknown> | undefined)
              ?.name as string | undefined,
          });
        }
      }
    }

    return { runId, resources };
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
          `Pipeline run sources not found: ${error.message}`,
        );
      }
    }

    throw new AzureDevOpsError(
      `Failed to get pipeline run sources: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
