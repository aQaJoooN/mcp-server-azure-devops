import { z } from 'zod';

export const SearchFailedBuildsSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  definitionId: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Optional pipeline definition ID to filter by'),
  branchName: z
    .string()
    .optional()
    .describe('Optional branch name to filter by (e.g. refs/heads/main)'),
  top: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(25)
    .describe(
      'Maximum number of failed builds to return (default 25, max 200)',
    ),
  minTime: z
    .string()
    .optional()
    .describe('Optional ISO 8601 start date/time filter'),
  maxTime: z
    .string()
    .optional()
    .describe('Optional ISO 8601 end date/time filter'),
});
