export * from './feature';
export * from './schema';

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { WebApi } from 'azure-devops-node-api';
import {
  RequestIdentifier,
  RequestHandler,
} from '../../shared/types/request-handler';
import { toJsonSchema } from '../../shared/utils/to-json-schema';
import { ListLibrariesSchema } from './schema';
import { listLibraries } from './feature';

export const librariesTools = [
  {
    name: 'list_libraries',
    description:
      'List variable groups (Libraries) in a project. Variable groups store values and secrets that can be used across pipelines.',
    inputSchema: toJsonSchema(ListLibrariesSchema),
  },
];

export const isLibrariesRequest: RequestIdentifier = (
  request: CallToolRequest,
): boolean => request.params.name === 'list_libraries';

export const handleLibrariesRequest: RequestHandler = async (
  connection: WebApi,
  request: CallToolRequest,
) => {
  const args = ListLibrariesSchema.parse(request.params.arguments);
  const result = await listLibraries(connection, {
    ...args,
    projectId: args.projectId,
  });
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
};
