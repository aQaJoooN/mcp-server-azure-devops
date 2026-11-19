import { z } from 'zod';

export const GetBuildLogsSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  buildId: z.number().int().min(1).describe('The numeric ID of the build'),
});
