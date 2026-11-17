import { z } from 'zod';

export const GetPipelineRunSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  runId: z.number().int().min(1).describe('Pipeline run identifier'),
  pipelineId: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Optional guard; validates the run belongs to this pipeline'),
});
