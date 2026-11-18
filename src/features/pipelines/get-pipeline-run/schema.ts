import { z } from 'zod';

export const GetPipelineRunSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  runId: z
    .number()
    .int()
    .min(1)
    .describe(
      'Pipeline run / build ID (e.g. 1238038). Large integer — copy the exact value from the build context, do not truncate it.',
    ),
  pipelineId: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Optional guard; validates the run belongs to this pipeline. Copy the exact integer — do not shorten or truncate it.',
    ),
});
