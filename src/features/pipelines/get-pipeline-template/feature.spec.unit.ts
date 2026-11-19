import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getPipelineTemplate } from './feature';

function makeStream(content: string) {
  const { Readable } = require('stream');
  const stream = new Readable({ read() {} });
  stream.push(content);
  stream.push(null);
  return stream;
}

function makeConn(stream: unknown, throws?: Error) {
  const getItemContent = throws
    ? jest.fn().mockRejectedValue(throws)
    : jest.fn().mockResolvedValue(stream);
  return {
    getGitApi: jest.fn().mockResolvedValue({ getItemContent }),
  } as unknown as WebApi;
}

describe('getPipelineTemplate', () => {
  it('returns template content on success', async () => {
    const content = 'steps:\n  - script: echo hello\n';
    const conn = makeConn(makeStream(content));
    const result = await getPipelineTemplate(
      conn,
      'proj',
      'my-repo',
      'templates/job.yml',
      'main',
    );
    expect(result.content).toBe(content);
    expect(result.repositoryId).toBe('my-repo');
    expect(result.templatePath).toBe('templates/job.yml');
    expect(result.branchName).toBe('main');
  });

  it('uses default branch "main" when not specified', async () => {
    const getItemContent = jest
      .fn()
      .mockResolvedValue(makeStream('# template'));
    const conn = {
      getGitApi: jest.fn().mockResolvedValue({ getItemContent }),
    } as unknown as WebApi;
    await getPipelineTemplate(conn, 'proj', 'repo', 'templates/t.yml');
    expect(getItemContent).toHaveBeenCalledWith(
      'repo',
      'templates/t.yml',
      'proj',
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      expect.objectContaining({ version: 'main' }),
      true,
    );
  });

  it('throws ResourceNotFoundError when stream is null', async () => {
    const conn = makeConn(null);
    await expect(
      getPipelineTemplate(conn, 'proj', 'repo', 'templates/missing.yml'),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('throws AuthenticationError on 401 message', async () => {
    const conn = makeConn(null, new Error('401 unauthorized'));
    await expect(
      getPipelineTemplate(conn, 'proj', 'repo', 'templates/t.yml'),
    ).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });

  it('throws ResourceNotFoundError on "not found" message', async () => {
    const conn = makeConn(null, new Error('path not found'));
    await expect(
      getPipelineTemplate(conn, 'proj', 'repo', 'templates/t.yml'),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('wraps unknown errors in AzureDevOpsError', async () => {
    const conn = makeConn(null, new Error('timeout'));
    await expect(
      getPipelineTemplate(conn, 'proj', 'repo', 'templates/t.yml'),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
