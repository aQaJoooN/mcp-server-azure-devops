import { WebApi } from 'azure-devops-node-api';
import { AzureDevOpsResourceNotFoundError } from '../../../shared/errors';
import { getBuildChanges } from './feature';

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

describe('getBuildChanges', () => {
  it('returns change list on success', async () => {
    const mockChanges = { count: 1, value: [{ id: 'abc', message: 'fix' }] };
    const conn = makeConnection(200, mockChanges);
    const result = await getBuildChanges(conn, 'proj', 10);
    expect(result).toEqual(mockChanges.value);
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConnection(404, null);
    await expect(getBuildChanges(conn, 'proj', 99)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });
});
