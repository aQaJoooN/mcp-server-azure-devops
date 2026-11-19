import { z } from 'zod';

export const GetLastSuccessfulBuildSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  definitionId: z
    .number()
    .int()
    .min(1)
    .describe('The pipeline definition ID'),
  branchName: z
    .string()
    .optional()
    .describe('Optional branch name to filter by (e.g. refs/heads/main)'),
});
