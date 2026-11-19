import { z } from 'zod';

export const GetPipelineTemplateSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  repositoryId: z
    .string()
    .describe('The ID or name of the repository containing the template'),
  templatePath: z
    .string()
    .describe('Path to the template file (e.g. templates/job.yml)'),
  branchName: z
    .string()
    .optional()
    .default('main')
    .describe('Branch to retrieve the template from (default: main)'),
});
