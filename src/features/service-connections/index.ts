export * from './feature';
export * from './schema';

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { WebApi } from 'azure-devops-node-api';
import {
  RequestIdentifier,
  RequestHandler,
} from '../../shared/types/request-handler';
import { toJsonSchema } from '../../shared/utils/to-json-schema';
import { ListServiceConnectionsSchema } from './schema';
import { listServiceConnections } from './feature';
import { defaultProject } from '../../utils/environment';

export const serviceConnectionsTools = [
  {
    name: 'list_service_connections',
    description:
      'List service connections (service endpoints) in a project. These are connections to external services used by pipelines.',
    inputSchema: toJsonSchema(ListServiceConnectionsSchema),
  },
];

export const isServiceConnectionsRequest: RequestIdentifier = (
  request: CallToolRequest,
): boolean => request.params.name === 'list_service_connections';

export const handleServiceConnectionsRequest: RequestHandler = async (
  connection: WebApi,
  request: CallToolRequest,
) => {
  const args = ListServiceConnectionsSchema.parse(request.params.arguments);
  const result = await listServiceConnections(connection, {
    ...args,
    projectId: args.projectId ?? defaultProject,
  });
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
};
