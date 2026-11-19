import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { GitCommit } from 'azure-devops-node-api/interfaces/GitInterfaces';

export async function getCommitDetails(
  connection: WebApi,
  projectId: string,
  repositoryId: string,
  commitId: string,
): Promise<GitCommit> {
  try {
    const gitApi = await connection.getGitApi();
    const commit = await gitApi.getCommit(commitId, repositoryId, projectId);

    if (!commit) {
      throw new AzureDevOpsResourceNotFoundError(
        `Commit ${commitId} not found in repository ${repositoryId}`,
      );
    }

    return commit;
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
        throw new AzureDevOpsResourceNotFoundError(
          `Commit ${commitId} not found: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get commit details: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
