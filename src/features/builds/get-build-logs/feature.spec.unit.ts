import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getBuildLogs } from './feature';

function makeConn(statusCode: number, result: unknown) {
  const rest = { get: jest.fn().mockResolvedValue({ statusCode, result }) };
  const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('getBuildLogs', () => {
  it('returns log list on success', async () => {
    const mockLogs = { count: 2, value: [{ id: 1, type: 'Container' }, { id: 2, type: 'Task' }] };
    const conn = makeConn(200, mockLogs);
    const result = await getBuildLogs(conn, 'proj', 10);
    expect(result).toEqual(mockLogs.value);
  });

  it('returns empty array when value is missing', async () => {
    const conn = makeConn(200, { count: 0, value: undefined });
    const result = await getBuildLogs(conn, 'proj', 10);
    expect(result).toEqual([]);
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConn(404, null);
    await expect(getBuildLogs(conn, 'proj', 999)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('throws AzureDevOpsError on network error', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('timeout')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(getBuildLogs(conn, 'proj', 1)).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('throws AuthenticationError on 401 message', async () => {
    const { AzureDevOpsAuthenticationError } = await import('../../../shared/errors');
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('401 unauthorized access')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(getBuildLogs(conn, 'proj', 1)).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });
});
