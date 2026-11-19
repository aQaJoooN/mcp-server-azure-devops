import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getCommitDetails } from './feature';

function makeConn(commit: unknown, throws?: Error) {
  const getCommit = throws
    ? jest.fn().mockRejectedValue(throws)
    : jest.fn().mockResolvedValue(commit);
  return {
    getGitApi: jest.fn().mockResolvedValue({ getCommit }),
  } as unknown as WebApi;
}

describe('getCommitDetails', () => {
  it('returns commit on success', async () => {
    const commit = { commitId: 'abc123', comment: 'fix: bug', author: { name: 'Alice' } };
    const conn = makeConn(commit);
    const result = await getCommitDetails(conn, 'proj', 'my-repo', 'abc123');
    expect(result).toEqual(commit);
  });

  it('throws ResourceNotFoundError when commit is null', async () => {
    const conn = makeConn(null);
    await expect(getCommitDetails(conn, 'proj', 'repo', 'deadbeef')).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('throws AuthenticationError on 401 message', async () => {
    const { AzureDevOpsAuthenticationError } = await import('../../../shared/errors');
    const conn = makeConn(null, new Error('401 unauthorized'));
    await expect(getCommitDetails(conn, 'proj', 'repo', 'abc')).rejects.toBeInstanceOf(
      AzureDevOpsAuthenticationError,
    );
  });

  it('throws ResourceNotFoundError on "not found" message', async () => {
    const conn = makeConn(null, new Error('resource not found'));
    await expect(getCommitDetails(conn, 'proj', 'repo', 'abc')).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('wraps unknown errors in AzureDevOpsError', async () => {
    const conn = makeConn(null, new Error('timeout'));
    await expect(getCommitDetails(conn, 'proj', 'repo', 'abc')).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
