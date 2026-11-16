import { WebApi } from 'azure-devops-node-api';
import { listBranches } from './feature';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';

describe('listBranches unit', () => {
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

  it('returns branches mapped from refs', async () => {
    mockGitApi.getRefs.mockResolvedValue([
      {
        name: 'refs/heads/main',
        objectId: 'abc123',
        isLocked: false,
        creator: { displayName: 'Alice', uniqueName: 'alice@example.com' },
      },
      {
        name: 'refs/heads/feature/x',
        objectId: 'def456',
        isLocked: false,
        creator: null,
      },
    ]);

    const result = await listBranches(mockConnection, {
      projectId: 'my-project',
      repositoryId: 'my-repo',
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'main',
      objectId: 'abc123',
      isLocked: false,
      creator: { displayName: 'Alice', uniqueName: 'alice@example.com' },
    });
    expect(result[1]).toEqual({
      name: 'feature/x',
      objectId: 'def456',
      isLocked: false,
      creator: undefined,
    });
    expect(mockGitApi.getRefs).toHaveBeenCalledWith(
      'my-repo',
      'my-project',
      'heads/',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('passes filter to getRefs', async () => {
    mockGitApi.getRefs.mockResolvedValue([
      { name: 'refs/heads/feature/foo', objectId: 'aaa', isLocked: false },
    ]);

    const result = await listBranches(mockConnection, {
      projectId: 'my-project',
      repositoryId: 'my-repo',
      filter: 'feature/',
    });

    expect(result[0].name).toBe('feature/foo');
    expect(mockGitApi.getRefs).toHaveBeenCalledWith(
      'my-repo',
      'my-project',
      'heads/',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'feature/',
    );
  });

  it('applies top limit on the client side', async () => {
    mockGitApi.getRefs.mockResolvedValue([
      { name: 'refs/heads/a', objectId: '1' },
      { name: 'refs/heads/b', objectId: '2' },
      { name: 'refs/heads/c', objectId: '3' },
    ]);

    const result = await listBranches(mockConnection, {
      projectId: 'p',
      repositoryId: 'r',
      top: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('a');
    expect(result[1].name).toBe('b');
  });

  it('returns empty array when getRefs returns null', async () => {
    mockGitApi.getRefs.mockResolvedValue(null);

    const result = await listBranches(mockConnection, {
      projectId: 'p',
      repositoryId: 'r',
    });

    expect(result).toEqual([]);
  });

  it('throws AzureDevOpsAuthenticationError on 401', async () => {
    mockGitApi.getRefs.mockRejectedValue(new Error('401 Unauthorized'));

    await expect(
      listBranches(mockConnection, { projectId: 'p', repositoryId: 'r' }),
    ).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });

  it('throws AzureDevOpsResourceNotFoundError on 404', async () => {
    mockGitApi.getRefs.mockRejectedValue(new Error('repository not found'));

    await expect(
      listBranches(mockConnection, { projectId: 'p', repositoryId: 'r' }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('wraps unexpected errors in AzureDevOpsError', async () => {
    mockGitApi.getRefs.mockRejectedValue(new Error('Something exploded'));

    await expect(
      listBranches(mockConnection, { projectId: 'p', repositoryId: 'r' }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('re-throws AzureDevOpsError subclasses unchanged', async () => {
    const original = new AzureDevOpsResourceNotFoundError('already typed');
    mockGitApi.getRefs.mockRejectedValue(original);

    await expect(
      listBranches(mockConnection, { projectId: 'p', repositoryId: 'r' }),
    ).rejects.toBe(original);
  });
});
