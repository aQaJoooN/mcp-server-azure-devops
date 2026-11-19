import { z } from 'zod';

export const GetAgentPoolStatusSchema = z.object({
  poolId: z.number().int().min(1).describe('The ID of the agent pool'),
});
