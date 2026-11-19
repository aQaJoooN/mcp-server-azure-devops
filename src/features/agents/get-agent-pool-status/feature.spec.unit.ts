import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getAgentPoolStatus } from './feature';

function makeConn(poolResult: unknown, agentsResult: unknown) {
  const rest = {
    get: jest
      .fn()
      .mockResolvedValueOnce({ statusCode: 200, result: poolResult })
      .mockResolvedValueOnce({ statusCode: 200, result: agentsResult }),
  };
  const buildApi = {
    createRequestOptions: jest.fn().mockReturnValue({}),
    rest,
  };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('getAgentPoolStatus', () => {
  it('returns pool status with agent summary', async () => {
    const pool = { id: 1, name: 'Default', size: 3, isHosted: false };
    const agents = {
      count: 3,
      value: [
        { id: 1, name: 'A1', status: 'online', enabled: true, version: '3.0' },
        { id: 2, name: 'A2', status: 'offline', enabled: true, version: '3.0' },
        { id: 3, name: 'A3', status: 'online', enabled: false, version: '3.0' },
      ],
    };
    const conn = makeConn(pool, agents);
    const result = await getAgentPoolStatus(conn, 1);

    expect(result.pool).toEqual(pool);
    expect(result.agents).toHaveLength(3);
    expect(result.summary.total).toBe(3);
    expect(result.summary.online).toBe(2);
    expect(result.summary.offline).toBe(1);
    expect(result.summary.enabled).toBe(2);
    expect(result.summary.disabled).toBe(1);
  });

  it('throws ResourceNotFoundError when pool 404', async () => {
    const rest = {
      get: jest.fn().mockResolvedValue({ statusCode: 404, result: null }),
    };
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest,
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(getAgentPoolStatus(conn, 99)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('wraps unknown errors in AzureDevOpsError', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('timeout')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(getAgentPoolStatus(conn, 1)).rejects.toBeInstanceOf(
      AzureDevOpsError,
    );
  });
});
