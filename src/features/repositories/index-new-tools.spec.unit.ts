/**
 * Tests for the 4 new repository tools added in the git investigation implementation.
 */
import { WebApi } from 'azure-devops-node-api';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { isRepositoriesRequest, handleRepositoriesRequest } from './index';
import { getCommitDetails } from './get-commit-details/feature';
import { getCommitDiff } from './get-commit-diff/feature';
import { getRepositoryFile } from './get-repository-file/feature';
import { getFileHistory } from './get-file-history/feature';

jest.mock('./get-commit-details/feature');
jest.mock('./get-commit-diff/feature');
jest.mock('./get-repository-file/feature');
jest.mock('./get-file-history/feature');

const mockConnection = {} as WebApi;

function makeRequest(name: string, args: Record<string, unknown> = {}): CallToolRequest {
  return { params: { name, arguments: args }, method: 'tools/call' } as CallToolRequest;
}

describe('isRepositoriesRequest — new tools', () => {
  it('returns true for all new repo tool names', () => {
    const tools = ['get_commit_details', 'get_commit_diff', 'get_repository_file', 'get_file_history'];
    for (const tool of tools) {
      expect(isRepositoriesRequest(makeRequest(tool))).toBe(true);
    }
  });
});

describe('handleRepositoriesRequest — new tools', () => {
  beforeEach(() => jest.clearAllMocks());

  it('handles get_commit_details', async () => {
    const commit = { commitId: 'abc123', comment: 'fix: issue' };
    (getCommitDetails as jest.Mock).mockResolvedValue(commit);
    const res = await handleRepositoriesRequest(
      mockConnection,
      makeRequest('get_commit_details', { projectId: 'proj', repositoryId: 'my-repo', commitId: 'abc123' }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(commit);
    expect(getCommitDetails).toHaveBeenCalledWith(mockConnection, 'proj', 'my-repo', 'abc123');
  });

  it('handles get_commit_diff', async () => {
    const diff = { commitId: 'abc123', changes: [{ path: '/src/f.ts', changeType: 'edit' }] };
    (getCommitDiff as jest.Mock).mockResolvedValue(diff);
    const res = await handleRepositoriesRequest(
      mockConnection,
      makeRequest('get_commit_diff', { projectId: 'proj', repositoryId: 'my-repo', commitId: 'abc123' }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(diff);
  });

  it('handles get_repository_file', async () => {
    const fileContent = { content: 'export const x = 1;\n', isDirectory: false };
    (getRepositoryFile as jest.Mock).mockResolvedValue(fileContent);
    const res = await handleRepositoriesRequest(
      mockConnection,
      makeRequest('get_repository_file', {
        projectId: 'proj', repositoryId: 'my-repo', path: '/src/x.ts', version: 'main',
      }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(fileContent);
  });

  it('handles get_file_history', async () => {
    const history = [
      { commitId: 'abc', comment: 'update', author: { name: 'Alice' } },
      { commitId: 'def', comment: 'initial', author: { name: 'Bob' } },
    ];
    (getFileHistory as jest.Mock).mockResolvedValue(history);
    const res = await handleRepositoriesRequest(
      mockConnection,
      makeRequest('get_file_history', { projectId: 'proj', repositoryId: 'repo', path: '/src/f.ts' }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(history);
  });
});
