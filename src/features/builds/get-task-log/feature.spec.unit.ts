import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getTaskLog } from './feature';

function makeConn(lines: string[] | null, throws?: Error) {
  const getBuildLogLines = throws
    ? jest.fn().mockRejectedValue(throws)
    : jest.fn().mockResolvedValue(lines);
  const buildApi = { getBuildLogLines };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
  } as unknown as WebApi;
}

describe('getTaskLog', () => {
  it('returns joined log lines on success', async () => {
    const conn = makeConn(['line 1', 'line 2', 'line 3']);
    const result = await getTaskLog(conn, 'proj', 10, 1);
    expect(result).toBe('line 1\nline 2\nline 3');
  });

  it('throws ResourceNotFoundError when lines is null', async () => {
    const conn = makeConn(null);
    await expect(getTaskLog(conn, 'proj', 10, 1)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('passes startLine and endLine to API', async () => {
    const buildApi = {
      getBuildLogLines: jest.fn().mockResolvedValue(['line']),
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
    } as unknown as WebApi;
    await getTaskLog(conn, 'proj', 10, 2, 5, 15);
    expect(buildApi.getBuildLogLines).toHaveBeenCalledWith(
      'proj',
      10,
      2,
      5,
      15,
    );
  });

  it('throws AuthenticationError on 401 message', async () => {
    const conn = makeConn(null, new Error('401 unauthorized'));
    await expect(getTaskLog(conn, 'proj', 10, 1)).rejects.toBeInstanceOf(
      AzureDevOpsAuthenticationError,
    );
  });

  it('throws ResourceNotFoundError on "not found" message', async () => {
    const conn = makeConn(null, new Error('resource not found'));
    await expect(getTaskLog(conn, 'proj', 10, 1)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('wraps unknown errors', async () => {
    const conn = makeConn(null, new Error('timeout'));
    await expect(getTaskLog(conn, 'proj', 10, 1)).rejects.toBeInstanceOf(
      AzureDevOpsError,
    );
  });
});
