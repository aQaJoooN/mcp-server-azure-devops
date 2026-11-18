import { z } from 'zod';

export const GetPipelineRunStageTasksSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  runId: z
    .number()
    .int()
    .min(1)
    .describe(
      'Pipeline run / build ID (e.g. 1238038). Large integer — copy the exact value from the build context, do not truncate it.',
    ),
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
