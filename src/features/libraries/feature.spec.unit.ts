import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../shared/errors';
import { listLibraries } from './feature';

function makeConn(statusCode: number, result: unknown) {
  const rest = { get: jest.fn().mockResolvedValue({ statusCode, result }) };
  const taskAgentApi = {
    createRequestOptions: jest.fn().mockReturnValue({}),
    rest,
  };
  return {
    getTaskAgentApi: jest.fn().mockResolvedValue(taskAgentApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('listLibraries', () => {
  it('returns variable groups on success', async () => {
    const mockData = { count: 1, value: [{ id: 1, name: 'SharedVars' }] };
    const conn = makeConn(200, mockData);
    const result = await listLibraries(conn, { projectId: 'proj' });
    expect(result).toEqual(mockData.value);
  });

  it('applies optional groupName and top filters', async () => {
    const mockData = { count: 0, value: [] };
    const rest = {
      get: jest.fn().mockResolvedValue({ statusCode: 200, result: mockData }),
    };
    const taskAgentApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest,
    };
    const conn = {
      getTaskAgentApi: jest.fn().mockResolvedValue(taskAgentApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await listLibraries(conn, {
      projectId: 'proj',
      groupName: 'SharedVars',
      top: 5,
    });
    const calledUrl: string = rest.get.mock.calls[0][0];
    expect(calledUrl).toContain('groupName=SharedVars');
    expect(calledUrl).toContain('%24top=5');
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConn(404, null);
    await expect(
      listLibraries(conn, { projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
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
    await expect(
      listLibraries(conn, { projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });

  it('throws ResourceNotFoundError on "not found" message', async () => {
    const taskAgentApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('not found')) },
    };
    const conn = {
      getTaskAgentApi: jest.fn().mockResolvedValue(taskAgentApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(
      listLibraries(conn, { projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
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
    await expect(
      listLibraries(conn, { projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
