import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getBuildDetails } from './feature';

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

describe('getBuildDetails', () => {
  it('returns build data on success', async () => {
    const mockBuild = { id: 42, buildNumber: '1.0', status: 'completed' };
    const conn = makeConnection(200, mockBuild);
    const result = await getBuildDetails(conn, 'MyProject', 42);
    expect(result).toEqual(mockBuild);
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConnection(404, null);
    await expect(getBuildDetails(conn, 'MyProject', 99)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('wraps unknown errors in AzureDevOpsError', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('network error')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(getBuildDetails(conn, 'MyProject', 1)).rejects.toBeInstanceOf(
      AzureDevOpsError,
    );
  });
});
