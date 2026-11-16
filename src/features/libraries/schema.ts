import { z } from 'zod';
import { defaultProject, defaultOrg } from '../../utils/environment';

export const ListLibrariesSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe(`The ID or name of the project (Default: ${defaultProject})`),
  organizationId: z
    .string()
    .optional()
    .describe(`The ID or name of the organization (Default: ${defaultOrg})`),
  groupName: z
    .string()
    .optional()
    .describe('Optional filter by variable group name (supports wildcards)'),
  top: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Maximum number of variable groups to return'),
});
