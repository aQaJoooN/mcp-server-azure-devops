import { z } from 'zod';

export const GetFileHistorySchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  repositoryId: z.string().describe('The ID or name of the repository'),
  path: z.string().describe('The path to the file (e.g. /src/index.ts)'),
  top: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe('Maximum number of commits to return (default 20, max 100)'),
  branchName: z
    .string()
    .optional()
    .describe('Branch name to search commits on (defaults to repository default branch)'),
});
