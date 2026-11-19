import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getBuildTimeline } from './feature';

function makeConnection(statusCode: number, result: unknown) {
  const rest = { get: jest.fn().mockResolvedValue({ statusCode, result }) };
  const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('getBuildTimeline', () => {
  it('returns timeline on success', async () => {
    const mockTimeline = { id: 'tl1', changeId: 1, records: [{ id: 'r1', name: 'Job1' }] };
    const conn = makeConnection(200, mockTimeline);
    const result = await getBuildTimeline(conn, 'proj', 10);
    expect(result).toEqual(mockTimeline);
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConnection(404, null);
    await expect(getBuildTimeline(conn, 'proj', 10)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });
});
