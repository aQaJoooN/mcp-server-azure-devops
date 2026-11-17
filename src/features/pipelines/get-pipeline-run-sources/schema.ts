import { z } from 'zod';

export const GetPipelineRunSourcesSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  runId: z.number().int().min(1).describe('The pipeline run ID'),
  pipelineId: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Optional pipeline ID for context'),
});
