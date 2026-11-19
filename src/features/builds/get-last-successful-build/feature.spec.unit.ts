import { WebApi } from 'azure-devops-node-api';
import { AzureDevOpsError } from '../../../shared/errors';
import { getLastSuccessfulBuild } from './feature';

function makeConn(result: unknown) {
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

describe('getLastSuccessfulBuild', () => {
  it('returns the first build when found', async () => {
    const mockBuild = { id: 5, result: 'succeeded', buildNumber: '1.5' };
    const conn = makeConn({ count: 1, value: [mockBuild] });
    const result = await getLastSuccessfulBuild(conn, 'proj', 10);
    expect(result).toEqual(mockBuild);
  });

  it('returns null when no builds found', async () => {
    const conn = makeConn({ count: 0, value: [] });
    const result = await getLastSuccessfulBuild(conn, 'proj', 10);
    expect(result).toBeNull();
  });

  it('returns null when result is null', async () => {
    const conn = makeConn(null);
    const result = await getLastSuccessfulBuild(conn, 'proj', 10);
    expect(result).toBeNull();
  });

  it('applies branchName filter in URL', async () => {
    const rest = {
      get: jest.fn().mockResolvedValue({
        statusCode: 200,
        result: { count: 0, value: [] },
      }),
    };
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest,
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await getLastSuccessfulBuild(conn, 'proj', 1, 'refs/heads/main');
    expect(rest.get.mock.calls[0][0]).toContain(
      'branchName=refs%2Fheads%2Fmain',
    );
  });

  it('wraps errors in AzureDevOpsError', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('network error')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(
      getLastSuccessfulBuild(conn, 'proj', 1),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
