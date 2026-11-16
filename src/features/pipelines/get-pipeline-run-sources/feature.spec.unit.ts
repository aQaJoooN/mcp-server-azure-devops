import { WebApi } from 'azure-devops-node-api';
import { getPipelineRunSources } from './feature';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';

describe('getPipelineRunSources unit', () => {
  let mockConnection: WebApi;
  let mockPipelinesApi: any;
  let mockRestGet: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRestGet = jest.fn();
    mockPipelinesApi = {
      rest: { get: mockRestGet },
      createRequestOptions: jest
        .fn()
        .mockReturnValue({ acceptHeader: 'application/json' }),
    };
    mockConnection = {
      serverUrl: 'https://dev.azure.com/testorg',
      getPipelinesApi: jest.fn().mockResolvedValue(mockPipelinesApi),
    } as unknown as WebApi;
  });

  it('returns repository resources from the run', async () => {
    mockRestGet.mockResolvedValue({
      statusCode: 200,
      result: {
        resources: {
          repositories: {
            self: {
              refName: 'refs/heads/main',
              version: 'abc123',
              repository: {
                type: 'azureReposGit',
                id: 'repo-id-1',
                name: 'my-repo',
              },
            },
          },
        },
      },
    });

    const result = await getPipelineRunSources(mockConnection, {
      projectId: 'my-project',
      runId: 42,
    });

    expect(result.runId).toBe(42);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]).toMatchObject({
      alias: 'self',
      type: 'repository',
      branch: 'main',
      commitId: 'abc123',
      repoType: 'azureReposGit',
      repositoryId: 'repo-id-1',
      repositoryName: 'my-repo',
    });
  });

  it('returns pipeline resources from the run', async () => {
    mockRestGet.mockResolvedValue({
      statusCode: 200,
      result: {
        resources: {
          pipelines: {
            upstream: {
              run: { id: 99 },
              pipeline: { id: 7, name: 'upstream-pipeline' },
            },
          },
        },
      },
    });

    const result = await getPipelineRunSources(mockConnection, {
      projectId: 'p',
      runId: 10,
    });

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]).toMatchObject({
      alias: 'upstream',
      type: 'pipeline',
      definitionId: 7,
      definitionName: 'upstream-pipeline',
    });
  });

  it('uses pipeline-scoped URL first when pipelineId is provided', async () => {
    mockRestGet.mockResolvedValue({
      statusCode: 200,
      result: { resources: {} },
    });

    await getPipelineRunSources(mockConnection, {
      projectId: 'p',
      runId: 5,
      pipelineId: 3,
    });

    const firstUrl: string = mockRestGet.mock.calls[0][0];
    expect(firstUrl).toContain('/pipelines/3/runs/5');
  });

  it('falls back to generic URL when pipeline-scoped returns 404', async () => {
    mockRestGet
      .mockResolvedValueOnce({ statusCode: 404, result: null })
      .mockResolvedValueOnce({
        statusCode: 200,
        result: { resources: {} },
      });

    const result = await getPipelineRunSources(mockConnection, {
      projectId: 'p',
      runId: 5,
      pipelineId: 3,
    });

    expect(result.resources).toHaveLength(0);
    expect(mockRestGet).toHaveBeenCalledTimes(2);
  });

  it('throws AzureDevOpsResourceNotFoundError when both URLs return 404', async () => {
    mockRestGet.mockResolvedValue({ statusCode: 404, result: null });

    await expect(
      getPipelineRunSources(mockConnection, {
        projectId: 'p',
        runId: 5,
        pipelineId: 3,
      }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('throws AzureDevOpsResourceNotFoundError when result is null', async () => {
    mockRestGet.mockResolvedValue({ statusCode: 200, result: null });

    await expect(
      getPipelineRunSources(mockConnection, { projectId: 'p', runId: 99 }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('throws AzureDevOpsAuthenticationError on 401', async () => {
    mockRestGet.mockRejectedValue(new Error('401 Unauthorized'));

    await expect(
      getPipelineRunSources(mockConnection, { projectId: 'p', runId: 1 }),
    ).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });

  it('wraps unexpected errors in AzureDevOpsError', async () => {
    mockRestGet.mockRejectedValue(new Error('Something broke'));

    await expect(
      getPipelineRunSources(mockConnection, { projectId: 'p', runId: 1 }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('returns empty resources when resources section is absent', async () => {
    mockRestGet.mockResolvedValue({
      statusCode: 200,
      result: {},
    });

    const result = await getPipelineRunSources(mockConnection, {
      projectId: 'p',
      runId: 1,
    });

    expect(result.resources).toHaveLength(0);
  });
});
