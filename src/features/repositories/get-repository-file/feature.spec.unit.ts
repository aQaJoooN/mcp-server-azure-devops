import { WebApi } from 'azure-devops-node-api';
import { GitVersionType } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { AzureDevOpsError } from '../../../shared/errors';
import { getRepositoryFile } from './feature';

jest.mock('../get-file-content/feature');
import { getFileContent } from '../get-file-content/feature';

describe('getRepositoryFile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls getFileContent with branch version descriptor', async () => {
    (getFileContent as jest.Mock).mockResolvedValue({
      content: 'hello',
      isDirectory: false,
    });
    const conn = {} as WebApi;
    const result = await getRepositoryFile(
      conn,
      'proj',
      'my-repo',
      '/src/app.ts',
      'main',
      'branch',
    );
    expect(result.content).toBe('hello');
    expect(getFileContent).toHaveBeenCalledWith(
      conn,
      'proj',
      'my-repo',
      '/src/app.ts',
      { versionType: GitVersionType.Branch, version: 'main' },
    );
  });

  it('calls getFileContent with commit version descriptor', async () => {
    (getFileContent as jest.Mock).mockResolvedValue({
      content: 'code',
      isDirectory: false,
    });
    const conn = {} as WebApi;
    await getRepositoryFile(conn, 'proj', 'repo', '/f.ts', 'abc123', 'commit');
    expect(getFileContent).toHaveBeenCalledWith(conn, 'proj', 'repo', '/f.ts', {
      versionType: GitVersionType.Commit,
      version: 'abc123',
    });
  });

  it('calls getFileContent with tag version descriptor', async () => {
    (getFileContent as jest.Mock).mockResolvedValue({
      content: 'tagged',
      isDirectory: false,
    });
    const conn = {} as WebApi;
    await getRepositoryFile(conn, 'proj', 'repo', '/f.ts', 'v1.0.0', 'tag');
    expect(getFileContent).toHaveBeenCalledWith(conn, 'proj', 'repo', '/f.ts', {
      versionType: GitVersionType.Tag,
      version: 'v1.0.0',
    });
  });

  it('calls getFileContent without version descriptor when version is undefined', async () => {
    (getFileContent as jest.Mock).mockResolvedValue({
      content: '',
      isDirectory: true,
    });
    const conn = {} as WebApi;
    await getRepositoryFile(conn, 'proj', 'repo', '/');
    expect(getFileContent).toHaveBeenCalledWith(
      conn,
      'proj',
      'repo',
      '/',
      undefined,
    );
  });

  it('wraps errors in AzureDevOpsError', async () => {
    (getFileContent as jest.Mock).mockRejectedValue(new Error('not found'));
    const conn = {} as WebApi;
    await expect(
      getRepositoryFile(conn, 'proj', 'repo', '/f.ts'),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
