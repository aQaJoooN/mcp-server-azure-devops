import { z } from 'zod';

/**
 * Schema for the getPipeline function
 */
export const GetPipelineSchema = z.object({
  // The project containing the pipeline
  projectId: z.string().describe('The ID or name of the project'),
  // The ID of the pipeline to retrieve
  pipelineId: z
    .number()
    .int()
    .positive()
    .describe(
      'The numeric pipeline definition ID (e.g. 7426). Copy the exact integer from the build context — do not shorten or truncate it.',
    ),
  // The version of the pipeline to retrieve
  pipelineVersion: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'The version of the pipeline to retrieve (latest if not specified)',
    ),
});
