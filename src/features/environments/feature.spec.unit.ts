import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../shared/errors';
import { listEnvironments } from './feature';

function makeConn(statusCode: number, result: unknown) {
  const rest = { get: jest.fn().mockResolvedValue({ statusCode, result }) };
  const taskAgentApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
  return {
    getTaskAgentApi: jest.fn().mockResolvedValue(taskAgentApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('listEnvironments', () => {
  it('returns environments on success', async () => {
    const mockData = { count: 2, value: [{ id: 1, name: 'Production' }, { id: 2, name: 'Staging' }] };
    const conn = makeConn(200, mockData);
    const result = await listEnvironments(conn, { projectId: 'proj' });
    expect(result).toEqual(mockData.value);
  });

  it('applies optional top and continuationToken', async () => {
    const mockData = { count: 0, value: [] };
    const rest = { get: jest.fn().mockResolvedValue({ statusCode: 200, result: mockData }) };
    const taskAgentApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
    const conn = {
      getTaskAgentApi: jest.fn().mockResolvedValue(taskAgentApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await listEnvironments(conn, { projectId: 'proj', top: 5, continuationToken: 10 });
    const calledUrl: string = rest.get.mock.calls[0][0];
    expect(calledUrl).toContain('%24top=5');
    expect(calledUrl).toContain('continuationToken=10');
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConn(404, null);
    await expect(listEnvironments(conn, { projectId: 'proj' })).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('throws AuthenticationError on 401 message', async () => {
    const taskAgentApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('401 unauthorized')) },
    };
    const conn = {
      getTaskAgentApi: jest.fn().mockResolvedValue(taskAgentApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(listEnvironments(conn, { projectId: 'proj' })).rejects.toBeInstanceOf(
      AzureDevOpsAuthenticationError,
    );
  });

  it('throws ResourceNotFoundError on "not found" message', async () => {
    const taskAgentApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('resource not found')) },
    };
    const conn = {
      getTaskAgentApi: jest.fn().mockResolvedValue(taskAgentApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(listEnvironments(conn, { projectId: 'proj' })).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('wraps unknown errors in AzureDevOpsError', async () => {
    const taskAgentApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('timeout')) },
    };
    const conn = {
      getTaskAgentApi: jest.fn().mockResolvedValue(taskAgentApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(listEnvironments(conn, { projectId: 'proj' })).rejects.toBeInstanceOf(
      AzureDevOpsError,
    );
  });
});
