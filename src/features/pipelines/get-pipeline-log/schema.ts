import { z } from 'zod';

export const GetPipelineLogSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  runId: z
    .number()
    .int()
    .min(1)
    .describe(
      'Pipeline run / build ID (e.g. 1238038). Large integer — copy the exact value from the build context, do not truncate it.',
    ),
  logId: z
    .number()
    .int()
    .min(1)
    .describe('Log identifier from the timeline record'),
  format: z
    .enum(['plain', 'json'])
    .optional()
    .describe('Optional format for the log contents (plain or json)'),
  startLine: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Optional starting line number for the log segment'),
  endLine: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Optional ending line number for the log segment'),
  pipelineId: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Optional pipeline numeric ID for reference only. Copy the exact integer — do not shorten or truncate it.',
    ),
});
