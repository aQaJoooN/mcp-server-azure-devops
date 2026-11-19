import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getPipelineResources } from './feature';

function makeConn(statusCode: number, result: unknown) {
  const rest = { get: jest.fn().mockResolvedValue({ statusCode, result }) };
  const buildApi = {
    createRequestOptions: jest.fn().mockReturnValue({}),
    rest,
  };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('getPipelineResources', () => {
  it('returns extracted resources from definition', async () => {
    const def = {
      id: 5,
      name: 'CI Pipeline',
      repository: {
        id: 'repo-1',
        name: 'MyRepo',
        type: 'TfsGit',
        defaultBranch: 'main',
        url: 'https://ado/repo',
      },
      process: {
        resources: {
          repositories: [{ alias: 'templates', type: 'git' }],
          pipelines: [{ pipeline: 'upstream' }],
        },
      },
    };
    const conn = makeConn(200, def);
    const result = await getPipelineResources(conn, 'proj', 5);
    expect(result.name).toBe('CI Pipeline');
    expect(result.primaryRepository?.name).toBe('MyRepo');
    expect(result.resources?.repositories).toHaveLength(1);
    expect(result.resources?.pipelines).toHaveLength(1);
  });

  it('returns definition without resources when none declared', async () => {
    const def = {
      id: 6,
      name: 'Simple Pipeline',
      repository: { id: 'repo-2', name: 'SimpleRepo', type: 'TfsGit' },
    };
    const conn = makeConn(200, def);
    const result = await getPipelineResources(conn, 'proj', 6);
    expect(result.resources).toBeUndefined();
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConn(404, null);
    await expect(
      getPipelineResources(conn, 'proj', 999),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('wraps unknown errors in AzureDevOpsError', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('timeout')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(getPipelineResources(conn, 'proj', 1)).rejects.toBeInstanceOf(
      AzureDevOpsError,
    );
  });
});
