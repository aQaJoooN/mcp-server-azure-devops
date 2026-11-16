export * from './feature';
export * from './schema';

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { WebApi } from 'azure-devops-node-api';
import {
  RequestIdentifier,
  RequestHandler,
} from '../../shared/types/request-handler';
import { toJsonSchema } from '../../shared/utils/to-json-schema';
import { ListEnvironmentsSchema } from './schema';
import { listEnvironments } from './feature';
import { defaultProject } from '../../utils/environment';

export const environmentsTools = [
  {
    name: 'list_environments',
    description:
      'List deployment environments in a project (Pipeline Environments used for approvals and deployment targets)',
    inputSchema: toJsonSchema(ListEnvironmentsSchema),
  },
];

export const isEnvironmentsRequest: RequestIdentifier = (
  request: CallToolRequest,
): boolean => request.params.name === 'list_environments';

export const handleEnvironmentsRequest: RequestHandler = async (
  connection: WebApi,
  request: CallToolRequest,
) => {
  const args = ListEnvironmentsSchema.parse(request.params.arguments);
  const result = await listEnvironments(connection, {
    ...args,
    projectId: args.projectId ?? defaultProject,
  });
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
};
