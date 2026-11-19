import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';

export interface PipelineYamlResult {
  definitionId: number;
  repositoryId?: string;
  yamlPath?: string;
  content?: string;
  error?: string;
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on('data', (c) => chunks.push(Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

export async function getPipelineYaml(
  connection: WebApi,
  projectId: string,
  definitionId: number,
): Promise<PipelineYamlResult> {
  try {
    const buildApi = await connection.getBuildApi();
    const baseUrl = connection.serverUrl.replace(/\/+$/, '');
    const defUrl = new URL(
      `${encodeURIComponent(projectId)}/_apis/build/definitions/${definitionId}`,
      `${baseUrl}/`,
    );
    defUrl.searchParams.set('api-version', apiVersion);

    const requestOptions = buildApi.createRequestOptions(
      'application/json',
      apiVersion,
    );
    const defResponse = await buildApi.rest.get<Record<string, unknown> | null>(
      defUrl.toString(),
      requestOptions,
    );

    if (defResponse.statusCode === 404 || !defResponse.result) {
      throw new AzureDevOpsResourceNotFoundError(
        `Pipeline definition ${definitionId} not found in project ${projectId}`,
      );
    }

    const definition = defResponse.result;
    const process = definition.process as Record<string, unknown> | undefined;
    const repository = definition.repository as
      | Record<string, unknown>
      | undefined;

    // Try to find the YAML path
    const yamlPath =
      (process?.yamlFilename as string | undefined) ??
      (repository?.properties as Record<string, string> | undefined)
        ?.yamlFilename;

    const repositoryId =
      (repository?.id as string | undefined) ??
      (repository?.name as string | undefined);

    if (!yamlPath) {
      return {
        definitionId,
        repositoryId,
        error:
          'No YAML file path found in pipeline definition (may be a classic pipeline)',
      };
    }

    if (!repositoryId) {
      return {
        definitionId,
        yamlPath,
        error: 'No repository ID found in pipeline definition',
      };
    }

    // Fetch the YAML content
    const gitApi = await connection.getGitApi();
    try {
      const stream = await gitApi.getItemContent(
        repositoryId,
        yamlPath,
        projectId,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        undefined,
        true,
      );

      const content = stream ? await streamToString(stream) : '';
      return { definitionId, repositoryId, yamlPath, content };
    } catch {
      return {
        definitionId,
        repositoryId,
        yamlPath,
        error: `Could not fetch YAML file at ${yamlPath}`,
      };
    }
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
          `Pipeline definition ${definitionId} not found: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get pipeline YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
