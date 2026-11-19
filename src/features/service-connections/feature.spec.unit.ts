import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../shared/errors';
import { listServiceConnections } from './feature';

function makeConn(statusCode: number, result: unknown) {
  const rest = { get: jest.fn().mockResolvedValue({ statusCode, result }) };
  const buildApi = {
    createRequestOptions: jest.fn().mockReturnValue({}),
    rest,
  };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('listServiceConnections', () => {
  it('returns connections on success', async () => {
    const mockData = {
      count: 1,
      value: [{ id: 'sc-1', name: 'DockerHub', type: 'docker' }],
    };
    const conn = makeConn(200, mockData);
    const result = await listServiceConnections(conn, { projectId: 'proj' });
    expect(result).toEqual(mockData.value);
  });

  it('applies optional type filter', async () => {
    const mockData = { count: 0, value: [] };
    const rest = {
      get: jest.fn().mockResolvedValue({ statusCode: 200, result: mockData }),
    };
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest,
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await listServiceConnections(conn, {
      projectId: 'proj',
      type: 'git',
      authSchemes: ['Token'],
      includeDetails: true,
    });
    const calledUrl: string = rest.get.mock.calls[0][0];
    expect(calledUrl).toContain('type=git');
    expect(calledUrl).toContain('authSchemes=Token');
    expect(calledUrl).toContain('includeDetails=true');
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConn(404, null);
    await expect(
      listServiceConnections(conn, { projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('throws AuthenticationError on 401 message', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('401 unauthorized')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(
      listServiceConnections(conn, { projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });

  it('throws ResourceNotFoundError on "not found" message', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: {
        get: jest.fn().mockRejectedValue(new Error('resource not found')),
      },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(
      listServiceConnections(conn, { projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('wraps unknown errors in AzureDevOpsError', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('network timeout')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(
      listServiceConnections(conn, { projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
