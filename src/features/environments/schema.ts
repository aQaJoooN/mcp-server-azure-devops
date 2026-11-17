import { z } from 'zod';
import { defaultOrg } from '../../utils/environment';

export const ListEnvironmentsSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  organizationId: z
    .string()
    .optional()
    .describe(`The ID or name of the organization (Default: ${defaultOrg})`),
  top: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Maximum number of environments to return'),
  continuationToken: z
    .number()
    .int()
    .optional()
    .describe('Continuation token for paging'),
});
