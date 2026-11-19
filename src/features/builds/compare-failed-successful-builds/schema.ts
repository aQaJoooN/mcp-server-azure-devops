import { z } from 'zod';

export const CompareFailedSuccessfulBuildsSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  failedBuildId: z
    .number()
    .int()
    .min(1)
    .describe('The numeric ID of the failed build'),
  definitionId: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Optional pipeline definition ID; inferred from the failed build when omitted',
    ),
  branchName: z
    .string()
    .optional()
    .describe('Optional branch name to restrict the successful-build search'),
});
