import { z } from 'zod';

export const GetRepositoryFileSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  repositoryId: z.string().describe('The ID or name of the repository'),
  path: z.string().describe('The path to the file (e.g. /src/index.ts)'),
  version: z
    .string()
    .optional()
    .describe('Commit SHA or branch/tag name to retrieve the file at'),
  versionType: z
    .enum(['branch', 'commit', 'tag'])
    .optional()
    .default('branch')
    .describe('Whether the version is a branch name, commit SHA, or tag'),
});
