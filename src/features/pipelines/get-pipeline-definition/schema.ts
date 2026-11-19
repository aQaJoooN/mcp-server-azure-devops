import { z } from 'zod';

export const GetPipelineDefinitionSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  definitionId: z.number().int().min(1).describe('The pipeline definition ID'),
  revision: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Optional revision number of the definition'),
});
