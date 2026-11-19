import { WebApi } from 'azure-devops-node-api';
import { GitVersionType } from 'azure-devops-node-api/interfaces/GitInterfaces';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on('data', (c) => chunks.push(Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

export interface PipelineTemplateResult {
  repositoryId: string;
  templatePath: string;
  branchName: string;
  content: string;
}

export async function getPipelineTemplate(
  connection: WebApi,
  projectId: string,
  repositoryId: string,
  templatePath: string,
  branchName = 'main',
): Promise<PipelineTemplateResult> {
  try {
    const gitApi = await connection.getGitApi();
    const stream = await gitApi.getItemContent(
      repositoryId,
      templatePath,
      projectId,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      {
        version: branchName,
        versionType: GitVersionType.Branch,
      },
      true,
    );

    if (!stream) {
      throw new AzureDevOpsResourceNotFoundError(
        `Template ${templatePath} not found in repository ${repositoryId}`,
      );
    }

    const content = await streamToString(stream);
    return { repositoryId, templatePath, branchName, content };
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
        throw new AzureDevOpsResourceNotFoundError(
          `Template ${templatePath} not found: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get pipeline template: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
