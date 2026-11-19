import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';

export interface CommitDiffResult {
  commitId: string;
  changes: {
    path?: string;
    originalPath?: string;
    changeType?: string | number;
  }[];
}

export async function getCommitDiff(
  connection: WebApi,
  projectId: string,
  repositoryId: string,
  commitId: string,
): Promise<CommitDiffResult> {
  try {
    const gitApi = await connection.getGitApi();
    const commitChanges = await gitApi.getChanges(commitId, repositoryId, projectId);

    if (!commitChanges) {
      throw new AzureDevOpsResourceNotFoundError(
        `Commit ${commitId} not found in repository ${repositoryId}`,
      );
    }

    const changes = (commitChanges.changes ?? []).map((entry) => ({
      path: entry.item?.path,
      originalPath: entry.originalPath,
      changeType: entry.changeType,
    }));

    return { commitId, changes };
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
      `Failed to get commit diff: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
