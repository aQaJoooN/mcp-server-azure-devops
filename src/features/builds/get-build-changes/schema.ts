import { z } from 'zod';

export const GetBuildChangesSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  buildId: z.number().int().min(1).describe('The numeric ID of the build'),
  top: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Maximum number of changes to return (max 200)'),
});
