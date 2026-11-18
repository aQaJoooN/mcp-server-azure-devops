import { z } from 'zod';

export const GetPipelineRunYamlSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  pipelineId: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'The numeric pipeline definition ID. If omitted, the runId is used to look up the build definition. Copy the exact integer — do not shorten or truncate it.',
    ),
  runId: z
    .number()
    .int()
    .min(1)
    .describe(
      'The pipeline run / build ID (e.g. 1238038). This is a large integer — copy the exact value from the build context, do not truncate it.',
    ),
});
