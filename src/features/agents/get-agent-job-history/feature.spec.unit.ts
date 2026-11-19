import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getAgentJobHistory } from './feature';

function makeConn(statusCode: number, result: unknown) {
  const rest = { get: jest.fn().mockResolvedValue({ statusCode, result }) };
  const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('getAgentJobHistory', () => {
  it('returns job history on success', async () => {
    const mockJobs = { count: 2, value: [{ requestId: 1 }, { requestId: 2 }] };
    const conn = makeConn(200, mockJobs);
    const result = await getAgentJobHistory(conn, 1, 5);
    expect(result).toEqual(mockJobs.value);
  });

  it('returns empty array when value is missing', async () => {
    const conn = makeConn(200, { count: 0 });
    const result = await getAgentJobHistory(conn, 1, 5);
    expect(result).toEqual([]);
  });

  it('uses default top of 25', async () => {
    const rest = { get: jest.fn().mockResolvedValue({ statusCode: 200, result: { count: 0, value: [] } }) };
    const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await getAgentJobHistory(conn, 1, 5);
    expect(rest.get.mock.calls[0][0]).toContain('completedRequestCount=25');
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConn(404, null);
    await expect(getAgentJobHistory(conn, 1, 5)).rejects.toBeInstanceOf(
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
    await expect(getAgentJobHistory(conn, 1, 5)).rejects.toBeInstanceOf(
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
    await expect(getAgentJobHistory(conn, 1, 5)).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
