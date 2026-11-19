import { WebApi } from 'azure-devops-node-api';
import { GitVersionType } from 'azure-devops-node-api/interfaces/GitInterfaces';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';

export interface FileHistoryEntry {
  commitId?: string;
  comment?: string;
  author?: { name?: string; email?: string; date?: string };
  url?: string;
}

export async function getFileHistory(
  connection: WebApi,
  projectId: string,
  repositoryId: string,
  path: string,
  top = 20,
  branchName?: string,
): Promise<FileHistoryEntry[]> {
  try {
    const gitApi = await connection.getGitApi();
    const commits = await gitApi.getCommits(
      repositoryId,
      {
        itemPath: path,
        itemVersion: branchName
          ? { version: branchName, versionType: GitVersionType.Branch }
          : undefined,
        $top: top,
      },
      projectId,
    );

    if (!commits) {
      throw new AzureDevOpsResourceNotFoundError(
        `File ${path} not found in repository ${repositoryId}`,
      );
    }

    return commits.map((c) => ({
      commitId: c.commitId,
      comment: c.comment,
      author: c.author
        ? { name: c.author.name, email: c.author.email, date: c.author.date?.toISOString() }
        : undefined,
      url: c.url,
    }));
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
        throw new AzureDevOpsResourceNotFoundError(
          `File ${path} not found: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get file history: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
