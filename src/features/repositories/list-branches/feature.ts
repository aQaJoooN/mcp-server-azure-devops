import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { defaultProject } from '../../../utils/environment';
import { z } from 'zod';
import { ListBranchesSchema } from './schema';

export type ListBranchesOptions = z.infer<typeof ListBranchesSchema>;

export interface BranchInfo {
  name: string;
  objectId: string;
  isLocked?: boolean;
  creator?: {
    displayName?: string;
    uniqueName?: string;
  };
}

export async function listBranches(
  connection: WebApi,
  options: ListBranchesOptions,
): Promise<BranchInfo[]> {
  try {
    const gitApi = await connection.getGitApi();
    const projectId = options.projectId ?? defaultProject;

    // filter must be the ref prefix relative to "refs/" — always use "heads/"
    // for branches. An additional text filter is passed via filterContains.
    const refs = await gitApi.getRefs(
      options.repositoryId,
      projectId,
      'heads/', // filter: only branch refs
      undefined, // includeLinks
      undefined, // includeStatuses
      undefined, // includeMyBranches
      undefined, // latestStatusesOnly
      undefined, // peelTags
      options.filter, // filterContains: substring match on branch name
    );

    if (!refs) {
      return [];
    }

    const results: BranchInfo[] = refs.map((ref) => ({
      name: ref.name ? ref.name.replace('refs/heads/', '') : '',
      objectId: ref.objectId ?? '',
      isLocked: ref.isLocked,
      creator: ref.creator
        ? {
            displayName: ref.creator.displayName,
            uniqueName: ref.creator.uniqueName,
          }
        : undefined,
    }));

    // Apply client-side top limit if specified
    return options.top ? results.slice(0, options.top) : results;
  } catch (error) {
    if (error instanceof AzureDevOpsError) {
      throw error;
    }
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
          `Repository not found: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to list branches: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
