import { WebApi } from 'azure-devops-node-api';
import { GitVersionType } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { AzureDevOpsError } from '../../../shared/errors';
import {
  getFileContent,
  FileContentResponse,
} from '../get-file-content/feature';

function toVersionType(type: 'branch' | 'commit' | 'tag'): GitVersionType {
  switch (type) {
    case 'commit':
      return GitVersionType.Commit;
    case 'tag':
      return GitVersionType.Tag;
    default:
      return GitVersionType.Branch;
  }
}

export async function getRepositoryFile(
  connection: WebApi,
  projectId: string,
  repositoryId: string,
  path: string,
  version?: string,
  versionType: 'branch' | 'commit' | 'tag' = 'branch',
): Promise<FileContentResponse> {
  try {
    const versionDescriptor = version
      ? { versionType: toVersionType(versionType), version }
      : undefined;

    return await getFileContent(
      connection,
      projectId,
      repositoryId,
      path,
      versionDescriptor,
    );
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    throw new AzureDevOpsError(
      `Failed to get repository file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
