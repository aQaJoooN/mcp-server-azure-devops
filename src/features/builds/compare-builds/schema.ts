import { z } from 'zod';

export const CompareBuildsSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  buildId1: z
    .number()
    .int()
    .min(1)
    .describe('The numeric ID of the first build'),
  buildId2: z
    .number()
    .int()
    .min(1)
    .describe('The numeric ID of the second build to compare against'),
});
