import { z } from 'zod';

export const GetAgentJobHistorySchema = z.object({
  poolId: z.number().int().min(1).describe('The ID of the agent pool'),
  agentId: z.number().int().min(1).describe('The ID of the agent'),
  top: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(25)
    .describe('Maximum number of job records to return (default 25, max 200)'),
});
