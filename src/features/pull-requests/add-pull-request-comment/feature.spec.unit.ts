import { WebApi } from 'azure-devops-node-api';
import { addPullRequestComment } from './feature';

function makeGitApi(overrides: Record<string, jest.Mock> = {}) {
  return {
    getPullRequestById: jest.fn().mockResolvedValue({
      repository: { id: 'repo-1' },
      lastMergeSourceCommit: { commitId: 'abc123' },
    }),
    createComment: jest.fn().mockResolvedValue({
      id: 1,
      content: 'my comment',
      commentType: 1,
    }),
    createThread: jest.fn().mockResolvedValue({
      id: 10,
      comments: [{ id: 1, content: 'thread comment', commentType: 1 }],
      status: 1,
    }),
    getItem: jest.fn().mockResolvedValue({ content: 'line1\nline2\nline3' }),
    ...overrides,
  };
}

function makeConn(gitApi: unknown) {
  return {
    getGitApi: jest.fn().mockResolvedValue(gitApi),
  } as unknown as WebApi;
}

describe('addPullRequestComment', () => {
  it('adds comment to existing thread', async () => {
    const gitApi = makeGitApi();
    const conn = makeConn(gitApi);
    const result = await addPullRequestComment(
      conn, 'proj', 'repo-1', 42,
      { content: 'reply', threadId: 5 },
    );
    expect(result.comment?.content).toBe('my comment');
    expect(gitApi.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'reply' }),
      'repo-1', 42, 5, 'proj',
    );
  });

  it('creates new thread without file context', async () => {
    const gitApi = makeGitApi();
    const conn = makeConn(gitApi);
    const result = await addPullRequestComment(
      conn, 'proj', 'repo-1', 42,
      { content: 'general comment' },
    );
    expect(result.thread).toBeDefined();
    expect(gitApi.createThread).toHaveBeenCalled();
  });

  it('creates thread with file context and line number', async () => {
    const gitApi = makeGitApi();
    const conn = makeConn(gitApi);
    await addPullRequestComment(
      conn, 'proj', 'repo-1', 42,
      { content: 'inline comment', filePath: '/src/app.ts', lineNumber: 2 },
    );
    const threadArg = gitApi.createThread.mock.calls[0][0];
    expect(threadArg.threadContext?.filePath).toBe('/src/app.ts');
    expect(threadArg.threadContext?.rightFileStart?.line).toBe(2);
  });

  it('creates thread with status set', async () => {
    const gitApi = makeGitApi();
    const conn = makeConn(gitApi);
    await addPullRequestComment(
      conn, 'proj', 'repo-1', 42,
      { content: 'needs work', status: 'active' },
    );
    const threadArg = gitApi.createThread.mock.calls[0][0];
    expect(threadArg.status).toBeDefined();
  });

  it('resolves repositoryId from PR when not provided', async () => {
    const gitApi = makeGitApi();
    const conn = makeConn(gitApi);
    const result = await addPullRequestComment(
      conn, 'proj', undefined, 42,
      { content: 'auto resolve repo' },
    );
    expect(gitApi.getPullRequestById).toHaveBeenCalledWith(42, 'proj');
    expect(result.thread).toBeDefined();
  });

  it('throws when repositoryId cannot be determined', async () => {
    const gitApi = makeGitApi({
      getPullRequestById: jest.fn().mockResolvedValue({ repository: {} }),
    });
    const conn = makeConn(gitApi);
    await expect(
      addPullRequestComment(conn, 'proj', undefined, 42, { content: 'x' }),
    ).rejects.toThrow('repositoryId is required');
  });

  it('throws when createThread returns no comments', async () => {
    const gitApi = makeGitApi({
      createThread: jest.fn().mockResolvedValue({ id: 1, comments: [] }),
    });
    const conn = makeConn(gitApi);
    await expect(
      addPullRequestComment(conn, 'proj', 'repo-1', 42, { content: 'x' }),
    ).rejects.toThrow('Failed to create pull request comment thread');
  });

  it('applies all thread statuses', async () => {
    const statuses = ['active', 'fixed', 'wontFix', 'closed', 'pending', 'byDesign', 'unknown'];
    for (const status of statuses) {
      const gitApi = makeGitApi();
      const conn = makeConn(gitApi);
      await addPullRequestComment(conn, 'proj', 'repo-1', 42, { content: 'x', status: status as never });
      const threadArg = gitApi.createThread.mock.calls[0][0];
      expect(threadArg.status).toBeDefined();
    }
  });

  it('wraps unknown errors', async () => {
    const gitApi = makeGitApi({
      createThread: jest.fn().mockRejectedValue(new Error('network')),
    });
    const conn = makeConn(gitApi);
    await expect(
      addPullRequestComment(conn, 'proj', 'repo-1', 42, { content: 'x' }),
    ).rejects.toThrow('Failed to add pull request comment');
  });
});
