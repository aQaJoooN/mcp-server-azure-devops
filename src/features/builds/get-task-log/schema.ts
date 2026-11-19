import { z } from 'zod';

export const GetTaskLogSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  buildId: z.number().int().min(1).describe('The numeric ID of the build'),
  logId: z
    .number()
    .int()
    .min(1)
    .describe('The log identifier from the timeline record'),
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
});
