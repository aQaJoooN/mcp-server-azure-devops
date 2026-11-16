import { z } from 'zod';
import { defaultProject } from '../../../utils/environment';

export const GetPipelineRunYamlSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe(`The ID or name of the project (Default: ${defaultProject})`),
  pipelineId: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'The pipeline numeric ID. If omitted, the runId is used to look up the build definition.',
    ),
  runId: z.number().int().min(1).describe('The pipeline run / build ID'),
});
