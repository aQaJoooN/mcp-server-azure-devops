import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getPipelineYaml } from './feature';

function makeStream(content: string) {
  const { Readable } = require('stream');
  const stream = new Readable({ read() {} });
  stream.push(content);
  stream.push(null);
  return stream;
}

function makeConn(defResult: unknown, yamlContent?: string) {
  const rest = { get: jest.fn().mockResolvedValue({ statusCode: defResult ? 200 : 404, result: defResult }) };
  const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
  const getItemContent = yamlContent !== undefined
    ? jest.fn().mockResolvedValue(makeStream(yamlContent))
    : jest.fn().mockRejectedValue(new Error('file not found'));
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    getGitApi: jest.fn().mockResolvedValue({ getItemContent }),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('getPipelineYaml', () => {
  it('fetches and returns YAML content', async () => {
    const def = {
      id: 1,
      name: 'CI',
      process: { yamlFilename: 'azure-pipelines.yml' },
      repository: { id: 'repo-1' },
    };
    const conn = makeConn(def, 'trigger:\n  branches:\n    include:\n      - main\n');
    const result = await getPipelineYaml(conn, 'proj', 1);
    expect(result.yamlPath).toBe('azure-pipelines.yml');
    expect(result.repositoryId).toBe('repo-1');
    expect(result.content).toContain('trigger:');
  });

  it('returns error when no YAML path in definition', async () => {
    const def = { id: 2, name: 'Classic', repository: { id: 'repo-2' } };
    const conn = makeConn(def);
    const result = await getPipelineYaml(conn, 'proj', 2);
    expect(result.error).toContain('No YAML file path');
  });

  it('returns error when YAML file cannot be fetched', async () => {
    const def = {
      id: 3,
      process: { yamlFilename: 'ci.yml' },
      repository: { id: 'repo-3' },
    };
    const conn = makeConn(def); // getItemContent will throw
    const result = await getPipelineYaml(conn, 'proj', 3);
    expect(result.error).toContain('Could not fetch YAML');
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConn(null);
    await expect(getPipelineYaml(conn, 'proj', 999)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('extracts yamlFilename from repository.properties', async () => {
    const def = {
      id: 4,
      repository: {
        id: 'repo-4',
        properties: { yamlFilename: 'build/ci.yml' },
      },
    };
    const conn = makeConn(def, '# pipeline yaml');
    const result = await getPipelineYaml(conn, 'proj', 4);
    expect(result.yamlPath).toBe('build/ci.yml');
    expect(result.content).toContain('pipeline yaml');
  });
});
