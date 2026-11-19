import { z } from 'zod';

export const GetAgentEnvironmentSummarySchema = z.object({
  poolId: z.number().int().min(1).describe('The ID of the agent pool'),
  agentId: z.number().int().min(1).describe('The ID of the agent'),
});
