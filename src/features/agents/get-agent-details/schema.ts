import { z } from 'zod';

export const GetAgentDetailsSchema = z.object({
  poolId: z.number().int().min(1).describe('The ID of the agent pool'),
  agentId: z.number().int().min(1).describe('The ID of the agent'),
  includeCapabilities: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include agent capabilities in the response'),
});
