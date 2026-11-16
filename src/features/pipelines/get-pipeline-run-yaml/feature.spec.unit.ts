import { Readable } from 'stream';
import { WebApi } from 'azure-devops-node-api';
import { getPipelineRunYaml } from './feature';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';

/** Build a minimal Readable stream from a string. */
function makeStream(content: string): Readable {
  return Readable.from([Buffer.from(content, 'utf-8')]);
}

describe('getPipelineRunYaml unit', () => {
  let mockConnection: WebApi;
  let mockPipelinesApi: any;
  let mockBuildApi: any;
  let mockGitApi: any;
  let mockPipelinesGet: jest.Mock;
  let mockBuildGet: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    mockPipelinesGet = jest.fn();
    mockBuildGet = jest.fn();

    mockPipelinesApi = {
      rest: { get: mockPipelinesGet },
      createRequestOptions: jest
        .fn()
        .mockReturnValue({ acceptHeader: 'application/json' }),
    };

    mockBuildApi = {
      rest: { get: mockBuildGet },
      createRequestOptions: jest
        .fn()
        .mockReturnValue({ acceptHeader: 'application/json' }),
    };

    mockGitApi = {
      getItemContent: jest.fn(),
    };

    mockConnection = {
      serverUrl: 'https://dev.azure.com/testorg',
      getPipelinesApi: jest.fn().mockResolvedValue(mockPipelinesApi),
      getBuildApi: jest.fn().mockResolvedValue(mockBuildApi),
      getGitApi: jest.fn().mockResolvedValue(mockGitApi),
    } as unknown as WebApi;
  });

  it('fetches the main pipeline YAML using pipelineId', async () => {
    // Pipeline definition response
    mockPipelinesGet.mockResolvedValue({
      statusCode: 200,
      result: {
        configuration: {
          path: 'pipeline.yaml',
          repository: { id: 'repo-123' },
        },
      },
    });

    const yamlContent = 'steps:\n  - script: echo hello\n';
    mockGitApi.getItemContent.mockResolvedValue(makeStream(yamlContent));

    const result = await getPipelineRunYaml(mockConnection, {
      projectId: 'my-project',
      pipelineId: 5,
      runId: 42,
    });

    expect(result.runId).toBe(42);
    expect(result.pipelinePath).toBe('pipeline.yaml');
    expect(result.files).toHaveLength(1);
    expect(result.files[0].content).toBe(yamlContent);
    expect(result.files[0].repositoryAlias).toBe('self');
  });

  it('resolves a simple template reference', async () => {
    mockPipelinesGet.mockResolvedValue({
      statusCode: 200,
      result: {
        configuration: {
          path: 'pipeline.yaml',
          repository: { id: 'repo-abc' },
        },
      },
    });

    const mainYaml = 'steps:\n- template: templates/build.yaml\n';
    const templateYaml = 'steps:\n  - script: echo build\n';

    mockGitApi.getItemContent
      .mockResolvedValueOnce(makeStream(mainYaml))
      .mockResolvedValueOnce(makeStream(templateYaml));

    const result = await getPipelineRunYaml(mockConnection, {
      projectId: 'p',
      pipelineId: 1,
      runId: 10,
    });

    expect(result.files).toHaveLength(2);
    expect(result.files[1].path).toBe('templates/build.yaml');
    expect(result.files[1].content).toBe(templateYaml);
  });

  it('falls back to build API when pipelineId is omitted', async () => {
    // Build run response
    mockBuildGet
      .mockResolvedValueOnce({
        statusCode: 200,
        result: {
          definition: { id: 7 },
          repository: { id: 'repo-xyz' },
          sourceBranch: 'refs/heads/main',
        },
      })
      // Pipeline definition lookup
      .mockResolvedValueOnce({
        statusCode: 200,
        result: {
          configuration: {
            path: 'ci.yaml',
            repository: { id: 'repo-xyz' },
          },
        },
      });

    // getPipelineDefinition uses pipelinesApi under the hood
    mockPipelinesGet.mockResolvedValue({
      statusCode: 200,
      result: {
        configuration: {
          path: 'ci.yaml',
          repository: { id: 'repo-xyz' },
        },
      },
    });

    const yamlContent = 'trigger:\n  - main\n';
    mockGitApi.getItemContent.mockResolvedValue(makeStream(yamlContent));

    const result = await getPipelineRunYaml(mockConnection, {
      projectId: 'p',
      runId: 55,
    });

    expect(result.pipelinePath).toBe('ci.yaml');
    expect(result.files[0].content).toBe(yamlContent);
  });

  it('returns a placeholder when YAML path cannot be determined', async () => {
    // Build run response — definition found but no YAML path
    mockBuildGet.mockResolvedValue({
      statusCode: 200,
      result: {
        definition: { id: 3 },
        repository: { id: 'repo-id' },
        sourceBranch: 'refs/heads/main',
      },
    });
    // Pipelines API fails (older TFS), build definitions also has no yamlFilename
    mockPipelinesGet.mockRejectedValue(new Error('not found'));
    // Build definition fallback
    mockBuildGet
      .mockResolvedValueOnce({
        statusCode: 200,
        result: {
          definition: { id: 3 },
          repository: { id: 'repo-id' },
          sourceBranch: 'refs/heads/main',
        },
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        result: { process: { type: 1 } }, // classic pipeline, no yamlFilename
      });

    const result = await getPipelineRunYaml(mockConnection, {
      projectId: 'p',
      runId: 1,
    });

    expect(result.pipelinePath).toBe('(unknown)');
    expect(result.files[0].content).toContain('Could not determine');
  });

  it('throws AzureDevOpsAuthenticationError on 401', async () => {
    mockPipelinesGet.mockResolvedValue({
      statusCode: 200,
      result: {
        configuration: {
          path: 'pipeline.yaml',
          repository: { id: 'r' },
        },
      },
    });
    mockGitApi.getItemContent.mockRejectedValue(new Error('401 unauthorized'));

    await expect(
      getPipelineRunYaml(mockConnection, {
        projectId: 'p',
        pipelineId: 1,
        runId: 1,
      }),
    ).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });

  it('throws AzureDevOpsResourceNotFoundError on 404', async () => {
    mockPipelinesGet.mockResolvedValue({
      statusCode: 200,
      result: {
        configuration: {
          path: 'pipeline.yaml',
          repository: { id: 'r' },
        },
      },
    });
    mockGitApi.getItemContent.mockRejectedValue(
      new Error('File not found: 404'),
    );

    await expect(
      getPipelineRunYaml(mockConnection, {
        projectId: 'p',
        pipelineId: 1,
        runId: 1,
      }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('wraps unexpected errors in AzureDevOpsError', async () => {
    mockPipelinesGet.mockRejectedValue(new Error('Unexpected boom'));
    mockBuildGet.mockRejectedValue(new Error('Unexpected boom'));

    await expect(
      getPipelineRunYaml(mockConnection, {
        projectId: 'p',
        pipelineId: 1,
        runId: 1,
      }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('skips duplicate template references', async () => {
    mockPipelinesGet.mockResolvedValue({
      statusCode: 200,
      result: {
        configuration: {
          path: 'pipeline.yaml',
          repository: { id: 'repo-abc' },
        },
      },
    });

    // Main YAML references the same template twice
    const mainYaml = [
      '- template: templates/common.yaml',
      '- template: templates/common.yaml',
    ].join('\n');
    const templateYaml = '# common template\n';

    mockGitApi.getItemContent
      .mockResolvedValueOnce(makeStream(mainYaml))
      .mockResolvedValueOnce(makeStream(templateYaml));

    const result = await getPipelineRunYaml(mockConnection, {
      projectId: 'p',
      pipelineId: 1,
      runId: 1,
    });

    // Template should only appear once
    expect(result.files).toHaveLength(2);
  });

  it('handles tag refs correctly', async () => {
    mockPipelinesGet.mockResolvedValue({
      statusCode: 200,
      result: {
        configuration: {
          path: 'pipeline.yaml',
          repository: { id: 'repo-abc' },
        },
      },
    });

    const mainYaml = [
      'resources:',
      '  repositories:',
      '    - repository: templates',
      '      name: MyProject/templates-repo',
      '      ref: refs/tags/v2.0.0',
      '      type: git',
      '- template: build.yaml@templates',
    ].join('\n');
    const templateYaml = '# tag template\n';

    mockGitApi.getItemContent
      .mockResolvedValueOnce(makeStream(mainYaml))
      .mockResolvedValueOnce(makeStream(templateYaml));

    const result = await getPipelineRunYaml(mockConnection, {
      projectId: 'p',
      pipelineId: 1,
      runId: 1,
    });

    expect(result.files).toHaveLength(2);
    expect(result.files[1].ref).toBe('refs/tags/v2.0.0');
  });
});
