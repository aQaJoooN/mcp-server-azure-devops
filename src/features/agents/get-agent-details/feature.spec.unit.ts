import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getAgentDetails } from './feature';

function makeConnection(statusCode: number, result: unknown) {
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

describe('getAgentDetails', () => {
  it('returns agent on success', async () => {
    const mockAgent = { id: 1, name: 'Agent1', status: 'online' };
    const conn = makeConnection(200, mockAgent);
    const result = await getAgentDetails(conn, 5, 1);
    expect(result).toEqual(mockAgent);
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConnection(404, null);
    await expect(getAgentDetails(conn, 5, 99)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('throws AzureDevOpsError on network failure', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('timeout')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(getAgentDetails(conn, 5, 1)).rejects.toBeInstanceOf(
      AzureDevOpsError,
    );
  });
});
