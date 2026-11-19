import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getFileHistory } from './feature';

function makeConn(commits: unknown, throws?: Error) {
  const getCommits = throws
    ? jest.fn().mockRejectedValue(throws)
    : jest.fn().mockResolvedValue(commits);
  return {
    getGitApi: jest.fn().mockResolvedValue({ getCommits }),
  } as unknown as WebApi;
}

describe('getFileHistory', () => {
  it('returns commit history on success', async () => {
    const mockCommits = [
      {
        commitId: 'abc1',
        comment: 'update file',
        author: {
          name: 'Alice',
          email: 'alice@test.com',
          date: new Date('2024-01-01'),
        },
        url: 'https://ado/commits/abc1',
      },
      {
        commitId: 'abc2',
        comment: 'initial',
        author: {
          name: 'Bob',
          email: 'bob@test.com',
          date: new Date('2023-12-01'),
        },
        url: 'https://ado/commits/abc2',
      },
    ];
    const conn = makeConn(mockCommits);
    const result = await getFileHistory(conn, 'proj', 'repo', '/src/app.ts');
    expect(result).toHaveLength(2);
    expect(result[0].commitId).toBe('abc1');
    expect(result[0].author?.name).toBe('Alice');
    expect(result[0].author?.date).toBe('2024-01-01T00:00:00.000Z');
  });

  it('applies branchName and top filters', async () => {
    const getCommits = jest.fn().mockResolvedValue([]);
    const conn = {
      getGitApi: jest.fn().mockResolvedValue({ getCommits }),
    } as unknown as WebApi;
    await getFileHistory(conn, 'proj', 'repo', '/src/f.ts', 10, 'main');
    const criteria = getCommits.mock.calls[0][1];
    expect(criteria.itemPath).toBe('/src/f.ts');
    expect(criteria.$top).toBe(10);
    expect(criteria.itemVersion?.version).toBe('main');
  });

  it('throws ResourceNotFoundError when commits is null', async () => {
    const conn = makeConn(null);
    await expect(
      getFileHistory(conn, 'proj', 'repo', '/src/f.ts'),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('wraps unknown errors in AzureDevOpsError', async () => {
    const conn = makeConn(null, new Error('network error'));
    await expect(
      getFileHistory(conn, 'proj', 'repo', '/src/f.ts'),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
