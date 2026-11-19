// Re-export schemas and types
export * from './schemas';
export * from './types';

// Re-export features
export * from './get-repository';
export * from './get-repository-details';
export * from './list-repositories';
export * from './get-file-content';
export * from './get-all-repositories-tree';
export * from './get-repository-tree';
export * from './create-branch';
export * from './create-commit';
export * from './list-commits';
export * from './list-branches';
export * from './list-tags';
export * from './get-commit-details';
export * from './get-commit-diff';
export * from './get-repository-file';
export * from './get-file-history';

// Export tool definitions
export * from './tool-definitions';

// New exports for request handling
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { WebApi } from 'azure-devops-node-api';
import { GitVersionType } from 'azure-devops-node-api/interfaces/GitInterfaces';
import {
  RequestIdentifier,
  RequestHandler,
} from '../../shared/types/request-handler';
import { defaultOrg } from '../../utils/environment';
import {
  GetRepositorySchema,
  GetRepositoryDetailsSchema,
  ListRepositoriesSchema,
  GetFileContentSchema,
  GetAllRepositoriesTreeSchema,
  GetRepositoryTreeSchema,
  CreateBranchSchema,
  CreateCommitSchema,
  ListCommitsSchema,
  getRepository,
  getRepositoryDetails,
  listRepositories,
  getFileContent,
  getAllRepositoriesTree,
  getRepositoryTree,
  createBranch,
  createCommit,
  listCommits,
  formatRepositoryTree,
} from './';
import { ListBranchesSchema } from './list-branches/schema';
import { listBranches } from './list-branches/feature';
import { ListTagsSchema } from './list-tags/schema';
import { listTags } from './list-tags/feature';
import { GetCommitDetailsSchema } from './get-commit-details/schema';
import { getCommitDetails } from './get-commit-details/feature';
import { GetCommitDiffSchema } from './get-commit-diff/schema';
import { getCommitDiff } from './get-commit-diff/feature';
import { GetRepositoryFileSchema } from './get-repository-file/schema';
import { getRepositoryFile } from './get-repository-file/feature';
import { GetFileHistorySchema } from './get-file-history/schema';
import { getFileHistory } from './get-file-history/feature';

/**
 * Checks if the request is for the repositories feature
 */
export const isRepositoriesRequest: RequestIdentifier = (
  request: CallToolRequest,
): boolean => {
  const toolName = request.params.name;
  return [
    'get_repository',
    'get_repository_details',
    'list_repositories',
    'get_file_content',
    'get_all_repositories_tree',
    'get_repository_tree',
    'create_branch',
    'create_commit',
    'list_commits',
    'list_branches',
    'list_tags',
    'get_commit_details',
    'get_commit_diff',
    'get_repository_file',
    'get_file_history',
  ].includes(toolName);
};

/**
 * Handles repositories feature requests
 */
export const handleRepositoriesRequest: RequestHandler = async (
  connection: WebApi,
  request: CallToolRequest,
): Promise<{ content: Array<{ type: string; text: string }> }> => {
  switch (request.params.name) {
    case 'get_repository': {
      const args = GetRepositorySchema.parse(request.params.arguments);
      const result = await getRepository(
        connection,
        args.projectId,
        args.repositoryId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_repository_details': {
      const args = GetRepositoryDetailsSchema.parse(request.params.arguments);
      const result = await getRepositoryDetails(connection, {
        projectId: args.projectId,
        repositoryId: args.repositoryId,
        includeStatistics: args.includeStatistics,
        includeRefs: args.includeRefs,
        refFilter: args.refFilter,
        branchName: args.branchName,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'list_repositories': {
      const args = ListRepositoriesSchema.parse(request.params.arguments);
      const result = await listRepositories(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_file_content': {
      const args = GetFileContentSchema.parse(request.params.arguments);

      // Map the string version type to the GitVersionType enum
      let versionTypeEnum: GitVersionType | undefined;
      if (args.versionType && args.version) {
        if (args.versionType === 'branch') {
          versionTypeEnum = GitVersionType.Branch;
        } else if (args.versionType === 'commit') {
          versionTypeEnum = GitVersionType.Commit;
        } else if (args.versionType === 'tag') {
          versionTypeEnum = GitVersionType.Tag;
        }
      }

      const result = await getFileContent(
        connection,
        args.projectId,
        args.repositoryId,
        args.path,
        versionTypeEnum !== undefined && args.version
          ? { versionType: versionTypeEnum, version: args.version }
          : undefined,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_all_repositories_tree': {
      const args = GetAllRepositoriesTreeSchema.parse(request.params.arguments);
      const result = await getAllRepositoriesTree(connection, {
        ...args,
        projectId: args.projectId,
        organizationId: args.organizationId ?? defaultOrg,
      });

      // Format the output as plain text tree representation
      let formattedOutput = '';
      for (const repo of result.repositories) {
        formattedOutput += formatRepositoryTree(
          repo.name,
          repo.tree,
          repo.stats,
          repo.error,
        );
        formattedOutput += '\n'; // Add blank line between repositories
      }

      return {
        content: [{ type: 'text', text: formattedOutput }],
      };
    }
    case 'get_repository_tree': {
      const args = GetRepositoryTreeSchema.parse(request.params.arguments);
      const result = await getRepositoryTree(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
    case 'create_branch': {
      const args = CreateBranchSchema.parse(request.params.arguments);
      await createBranch(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: 'Branch created successfully' }],
      };
    }
    case 'create_commit': {
      const args = CreateCommitSchema.parse(request.params.arguments);
      await createCommit(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: 'Commit created successfully' }],
      };
    }
    case 'list_commits': {
      const args = ListCommitsSchema.parse(request.params.arguments);
      const result = await listCommits(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'list_branches': {
      const args = ListBranchesSchema.parse(request.params.arguments);
      const result = await listBranches(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'list_tags': {
      const args = ListTagsSchema.parse(request.params.arguments);
      const result = await listTags(connection, {
        ...args,
        projectId: args.projectId,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_commit_details': {
      const args = GetCommitDetailsSchema.parse(request.params.arguments);
      const result = await getCommitDetails(
        connection,
        args.projectId,
        args.repositoryId,
        args.commitId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_commit_diff': {
      const args = GetCommitDiffSchema.parse(request.params.arguments);
      const result = await getCommitDiff(
        connection,
        args.projectId,
        args.repositoryId,
        args.commitId,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_repository_file': {
      const args = GetRepositoryFileSchema.parse(request.params.arguments);
      const result = await getRepositoryFile(
        connection,
        args.projectId,
        args.repositoryId,
        args.path,
        args.version,
        args.versionType,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'get_file_history': {
      const args = GetFileHistorySchema.parse(request.params.arguments);
      const result = await getFileHistory(
        connection,
        args.projectId,
        args.repositoryId,
        args.path,
        args.top,
        args.branchName,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    default:
      throw new Error(`Unknown repositories tool: ${request.params.name}`);
  }
};
