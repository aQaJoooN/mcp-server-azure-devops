import { z } from 'zod';

export const GetPipelineRunStageTasksSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  runId: z.number().int().min(1).describe('The pipeline run ID'),
  stageName: z
    .string()
    .optional()
    .describe(
      'Optional stage name filter (matches the stage displayName or identifier)',
    ),
  jobName: z
    .string()
    .optional()
    .describe(
      'Optional job name filter (matches the job displayName or identifier)',
    ),
});
