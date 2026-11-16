import { z } from 'zod';
import { defaultProject, defaultOrg } from '../../utils/environment';

export const ListServiceConnectionsSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe(`The ID or name of the project (Default: ${defaultProject})`),
  organizationId: z
    .string()
    .optional()
    .describe(`The ID or name of the organization (Default: ${defaultOrg})`),
  type: z
    .string()
    .optional()
    .describe(
      'Optional filter by endpoint type (e.g. "git", "azurerm", "kubernetes")',
    ),
  authSchemes: z
    .array(z.string())
    .optional()
    .describe('Optional filter by authentication schemes'),
  includeDetails: z
    .boolean()
    .optional()
    .describe(
      'Whether to include full details (data/authorization) in the response',
    ),
});
