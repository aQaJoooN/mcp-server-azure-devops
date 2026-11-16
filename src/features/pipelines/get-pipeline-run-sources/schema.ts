import { z } from 'zod';
import { defaultProject } from '../../../utils/environment';

export const GetPipelineRunSourcesSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe(`The ID or name of the project (Default: ${defaultProject})`),
  runId: z
    .number()
    .int()
    .min(1)
    .describe('The pipeline run ID'),
  pipelineId: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Optional pipeline ID for context'),
});
