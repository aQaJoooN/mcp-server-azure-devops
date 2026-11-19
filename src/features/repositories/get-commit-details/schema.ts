import { z } from 'zod';

export const GetCommitDetailsSchema = z.object({
  projectId: z.string().describe('The ID or name of the project'),
  repositoryId: z.string().describe('The ID or name of the repository'),
  commitId: z.string().describe('The full SHA of the commit'),
});
