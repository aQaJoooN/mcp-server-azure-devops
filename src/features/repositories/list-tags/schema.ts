import { z } from 'zod';
import { defaultProject, defaultOrg } from '../../../utils/environment';

export const ListTagsSchema = z.object({
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
    .describe('Optional prefix filter for tag names'),
  top: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Maximum number of tags to return'),
});
