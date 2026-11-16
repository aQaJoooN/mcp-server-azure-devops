import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { defaultProject } from '../../../utils/environment';
import { z } from 'zod';
import { ListTagsSchema } from './schema';

export type ListTagsOptions = z.infer<typeof ListTagsSchema>;

export interface TagInfo {
  name: string;
  objectId: string;
  tagger?: {
    displayName?: string;
    uniqueName?: string;
  };
}

export async function listTags(
  connection: WebApi,
  options: ListTagsOptions,
): Promise<TagInfo[]> {
  try {
    const gitApi = await connection.getGitApi();
    const projectId = options.projectId ?? defaultProject;

    const refs = await gitApi.getRefs(
      options.repositoryId,
      projectId,
      'tags/', // filter: only tag refs
      undefined, // includeLinks
      undefined, // includeStatuses
      undefined, // includeMyBranches
      undefined, // latestStatusesOnly
      true,      // peelTags: include the tagged commit objectId
      options.filter, // filterContains: substring match on tag name
    );

    if (!refs) {
      return [];
    }

    const results: TagInfo[] = refs.map((ref) => ({
      name: ref.name ? ref.name.replace('refs/tags/', '') : '',
      objectId: ref.objectId ?? '',
      tagger: ref.creator
        ? {
            displayName: ref.creator.displayName,
            uniqueName: ref.creator.uniqueName,
          }
        : undefined,
    }));

    return options.top ? results.slice(0, options.top) : results;
  } catch (error) {
    if (error instanceof AzureDevOpsError) {
      throw error;
    }
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
        throw new AzureDevOpsResourceNotFoundError(`Repository not found: ${error.message}`);
      }
    }
    throw new AzureDevOpsError(
      `Failed to list tags: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
