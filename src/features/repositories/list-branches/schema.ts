import { z } from 'zod';
import { defaultProject, defaultOrg } from '../../../utils/environment';

export const ListBranchesSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe(`The ID or name of the project (Default: ${defaultProject})`),
  organizationId: z
    .string()
    .optional()
    .describe(`The ID or name of the organization (Default: ${defaultOrg})`),
  repositoryId: z.string().describe('The ID or name of the repository'),
  filter: z
    .string()
    .optional()
    .describe('Optional prefix filter for branch names (e.g. "feature/")'),
  top: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Maximum number of branches to return'),
});
