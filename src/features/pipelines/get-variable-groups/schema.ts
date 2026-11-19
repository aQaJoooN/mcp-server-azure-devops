import { z } from 'zod';

export const GetVariableGroupsSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  groupName: z
    .string()
    .optional()
    .describe('Optional filter by variable group name'),
  top: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(50)
    .describe('Maximum number of variable groups to return (default 50)'),
});
