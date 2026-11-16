import { WebApi } from 'azure-devops-node-api';
import { listTags } from './feature';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';

describe('listTags unit', () => {
  let mockConnection: WebApi;
  let mockGitApi: any;

  beforeEach(() => {
    jest.resetAllMocks();
    mockGitApi = {
      getRefs: jest.fn(),
    };
    mockConnection = {
      getGitApi: jest.fn().mockResolvedValue(mockGitApi),
    } as unknown as WebApi;
  });

  it('returns tags mapped from refs', async () => {
    mockGitApi.getRefs.mockResolvedValue([
      {
        name: 'refs/tags/v1.0.0',
        objectId: 'sha1',
        creator: { displayName: 'Alice', uniqueName: 'alice@example.com' },
      },
      {
        name: 'refs/tags/v2.0.0',
        objectId: 'sha2',
        creator: null,
      },
    ]);

    const result = await listTags(mockConnection, {
      projectId: 'my-project',
      repositoryId: 'my-repo',
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'v1.0.0',
      objectId: 'sha1',
      tagger: { displayName: 'Alice', uniqueName: 'alice@example.com' },
    });
    expect(result[1]).toEqual({
      name: 'v2.0.0',
      objectId: 'sha2',
      tagger: undefined,
    });
    expect(mockGitApi.getRefs).toHaveBeenCalledWith(
      'my-repo',
      'my-project',
      'tags/',
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      undefined,
    );
  });

  it('passes filter to getRefs', async () => {
    mockGitApi.getRefs.mockResolvedValue([
      { name: 'refs/tags/v1.0.0', objectId: 'sha1', creator: null },
    ]);

    const result = await listTags(mockConnection, {
      projectId: 'p',
      repositoryId: 'r',
      filter: 'v1',
    });

    expect(result[0].name).toBe('v1.0.0');
    expect(mockGitApi.getRefs).toHaveBeenCalledWith(
      'r',
      'p',
      'tags/',
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      'v1',
    );
  });

  it('applies top limit on the client side', async () => {
    mockGitApi.getRefs.mockResolvedValue([
      { name: 'refs/tags/v1.0.0', objectId: 'a', creator: null },
      { name: 'refs/tags/v1.1.0', objectId: 'b', creator: null },
      { name: 'refs/tags/v2.0.0', objectId: 'c', creator: null },
    ]);

    const result = await listTags(mockConnection, {
      projectId: 'p',
      repositoryId: 'r',
      top: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('v1.0.0');
    expect(result[1].name).toBe('v1.1.0');
  });

  it('returns empty array when getRefs returns null', async () => {
    mockGitApi.getRefs.mockResolvedValue(null);

    const result = await listTags(mockConnection, {
      projectId: 'p',
      repositoryId: 'r',
    });

    expect(result).toEqual([]);
  });

  it('throws AzureDevOpsAuthenticationError on 401', async () => {
    mockGitApi.getRefs.mockRejectedValue(new Error('401 Unauthorized'));

    await expect(
      listTags(mockConnection, { projectId: 'p', repositoryId: 'r' }),
    ).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });

  it('throws AzureDevOpsResourceNotFoundError on 404', async () => {
    mockGitApi.getRefs.mockRejectedValue(new Error('repository not found'));

    await expect(
      listTags(mockConnection, { projectId: 'p', repositoryId: 'r' }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('wraps unexpected errors in AzureDevOpsError', async () => {
    mockGitApi.getRefs.mockRejectedValue(new Error('Something exploded'));

    await expect(
      listTags(mockConnection, { projectId: 'p', repositoryId: 'r' }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('re-throws AzureDevOpsError subclasses unchanged', async () => {
    const original = new AzureDevOpsResourceNotFoundError('already typed');
    mockGitApi.getRefs.mockRejectedValue(original);

    await expect(
      listTags(mockConnection, { projectId: 'p', repositoryId: 'r' }),
    ).rejects.toBe(original);
  });
});
