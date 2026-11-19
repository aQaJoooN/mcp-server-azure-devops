import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getCommitDiff } from './feature';

function makeConn(changes: unknown, throws?: Error) {
  const getChanges = throws
    ? jest.fn().mockRejectedValue(throws)
    : jest.fn().mockResolvedValue(changes);
  return {
    getGitApi: jest.fn().mockResolvedValue({ getChanges }),
  } as unknown as WebApi;
}

describe('getCommitDiff', () => {
  it('returns change list on success', async () => {
    const mockChanges = {
      changes: [
        { item: { path: '/src/app.ts', objectId: 'oid1' }, originalPath: undefined, changeType: 'edit' },
        { item: { path: '/src/utils.ts' }, originalPath: '/src/utils-old.ts', changeType: 'rename' },
      ],
    };
    const conn = makeConn(mockChanges);
    const result = await getCommitDiff(conn, 'proj', 'repo', 'abc123');
    expect(result.commitId).toBe('abc123');
    expect(result.changes).toHaveLength(2);
    expect(result.changes[0].path).toBe('/src/app.ts');
    expect(result.changes[1].originalPath).toBe('/src/utils-old.ts');
  });

  it('throws ResourceNotFoundError when changes is null', async () => {
    const conn = makeConn(null);
    await expect(getCommitDiff(conn, 'proj', 'repo', 'abc')).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('wraps unknown errors in AzureDevOpsError', async () => {
    const conn = makeConn(null, new Error('timeout'));
    await expect(getCommitDiff(conn, 'proj', 'repo', 'abc')).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
