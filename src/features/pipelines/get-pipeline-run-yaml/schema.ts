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
    .describe('The pipeline numeric ID'),
  runId: z
    .number()
    .int()
    .min(1)
    .describe('The pipeline run ID'),
});
