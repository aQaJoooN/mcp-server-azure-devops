import { WebApi } from 'azure-devops-node-api';
import { searchFailedBuilds } from './feature';

function makeConnection(result: unknown) {
  const rest = {
    get: jest.fn().mockResolvedValue({ statusCode: 200, result }),
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

describe('searchFailedBuilds', () => {
  it('returns failed builds list', async () => {
    const mockBuilds = { count: 2, value: [{ id: 1 }, { id: 2 }] };
    const conn = makeConnection(mockBuilds);
    const result = await searchFailedBuilds(conn, 'proj');
    expect(result).toEqual(mockBuilds.value);
  });

  it('returns empty array when result is null', async () => {
    const conn = makeConnection(null);
    const result = await searchFailedBuilds(conn, 'proj');
    expect(result).toEqual([]);
  });
});
