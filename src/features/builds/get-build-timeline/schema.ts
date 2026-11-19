import { z } from 'zod';

export const GetBuildTimelineSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  buildId: z.number().int().min(1).describe('The numeric ID of the build'),
  timelineId: z
    .string()
    .optional()
    .describe('Optional specific timeline ID to retrieve'),
});
