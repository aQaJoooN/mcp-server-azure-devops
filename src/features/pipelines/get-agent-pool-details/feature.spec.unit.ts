import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getAgentPoolDetails } from './feature';

function makeConn(defResult: unknown, poolResult?: unknown) {
  const getMock = poolResult !== undefined
    ? jest.fn()
        .mockResolvedValueOnce({ statusCode: defResult ? 200 : 404, result: defResult })
        .mockResolvedValueOnce({ statusCode: 200, result: poolResult })
    : jest.fn().mockResolvedValue({ statusCode: defResult ? 200 : 404, result: defResult });
  const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest: { get: getMock } };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('getAgentPoolDetails', () => {
  it('returns queue and pool details when queueId is present', async () => {
    const def = { id: 1, name: 'CI', queue: { id: 5, name: 'Default' } };
    const pool = { id: 5, name: 'Default', size: 3, isHosted: false, poolType: 'automation' };
    const conn = makeConn(def, pool);
    const result = await getAgentPoolDetails(conn, 'proj', 1);
    expect(result.queue?.id).toBe(5);
    expect(result.pool?.name).toBe('Default');
    expect(result.pool?.size).toBe(3);
  });

  it('returns only queue when no queueId', async () => {
    const def = { id: 1, name: 'CI', queue: { name: 'No ID Queue' } };
    const conn = makeConn(def);
    const result = await getAgentPoolDetails(conn, 'proj', 1);
    expect(result.queue?.name).toBe('No ID Queue');
    expect(result.pool).toBeUndefined();
  });

  it('handles definition with queuePool id', async () => {
    const def = { id: 1, name: 'CI', queue: { pool: { id: 7 }, name: 'PoolQueue' } };
    const pool = { id: 7, name: 'BuildPool' };
    const conn = makeConn(def, pool);
    const result = await getAgentPoolDetails(conn, 'proj', 1);
    expect(result.pool?.id).toBe(7);
  });

  it('throws ResourceNotFoundError on 404 definition', async () => {
    const conn = makeConn(null);
    await expect(getAgentPoolDetails(conn, 'proj', 999)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
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
    await expect(getAgentPoolDetails(conn, 'proj', 1)).rejects.toBeInstanceOf(
      AzureDevOpsAuthenticationError,
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
    await expect(getAgentPoolDetails(conn, 'proj', 1)).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('returns undefined pool when pool response result is null', async () => {
    const def = { id: 1, name: 'CI', queue: { id: 5, name: 'Default' } };
    const getMock = jest.fn()
      .mockResolvedValueOnce({ statusCode: 200, result: def })
      .mockResolvedValueOnce({ statusCode: 200, result: null });
    const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest: { get: getMock } };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    const result = await getAgentPoolDetails(conn, 'proj', 1);
    expect(result.pool).toBeUndefined();
  });
});
