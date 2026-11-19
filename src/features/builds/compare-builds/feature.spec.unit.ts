import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { compareBuilds } from './feature';

function makeConn(build1: unknown, build2: unknown) {
  const rest = {
    get: jest.fn()
      .mockResolvedValueOnce({ statusCode: 200, result: build1 })
      .mockResolvedValueOnce({ statusCode: 200, result: build2 }),
  };
  const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('compareBuilds', () => {
  it('returns comparison with no differences when builds are identical', async () => {
    const build = { id: 1, buildNumber: '1.0', status: 'completed', result: 'succeeded', sourceBranch: 'main', sourceVersion: 'abc', definition: { id: 10 } };
    const conn = makeConn(build, { ...build, id: 2 });
    const result = await compareBuilds(conn, 'proj', 1, 2);
    expect(result.differences).toHaveLength(0);
  });

  it('detects differences between builds', async () => {
    const build1 = { id: 1, buildNumber: '1.0', status: 'completed', result: 'succeeded', sourceBranch: 'main', sourceVersion: 'abc', definition: { id: 10 } };
    const build2 = { id: 2, buildNumber: '2.0', status: 'completed', result: 'failed', sourceBranch: 'feature', sourceVersion: 'xyz', definition: { id: 10 } };
    const conn = makeConn(build1, build2);
    const result = await compareBuilds(conn, 'proj', 1, 2);
    const fields = result.differences.map((d) => d.field);
    expect(fields).toContain('result');
    expect(fields).toContain('sourceBranch');
    expect(fields).toContain('sourceVersion');
    expect(fields).toContain('buildNumber');
  });

  it('detects definition id difference', async () => {
    const build1 = { id: 1, definition: { id: 10 } };
    const build2 = { id: 2, definition: { id: 20 } };
    const conn = makeConn(build1, build2);
    const result = await compareBuilds(conn, 'proj', 1, 2);
    expect(result.differences.some((d) => d.field === 'definition.id')).toBe(true);
  });

  it('throws ResourceNotFoundError when first build is 404', async () => {
    const rest = {
      get: jest.fn().mockResolvedValue({ statusCode: 404, result: null }),
    };
    const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(compareBuilds(conn, 'proj', 999, 1000)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });
});
