import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getPipelineDefinition } from './feature';

function makeConn(statusCode: number, result: unknown) {
  const rest = { get: jest.fn().mockResolvedValue({ statusCode, result }) };
  const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('getPipelineDefinition', () => {
  it('returns definition on success', async () => {
    const def = { id: 10, name: 'CI Build', type: 2 };
    const conn = makeConn(200, def);
    const result = await getPipelineDefinition(conn, 'proj', 10);
    expect(result).toEqual(def);
  });

  it('appends revision to URL when provided', async () => {
    const rest = { get: jest.fn().mockResolvedValue({ statusCode: 200, result: { id: 1 } }) };
    const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await getPipelineDefinition(conn, 'proj', 1, 3);
    expect(rest.get.mock.calls[0][0]).toContain('revision=3');
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConn(404, null);
    await expect(getPipelineDefinition(conn, 'proj', 999)).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('throws AuthenticationError on 401 message', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('401 unauthorized')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(getPipelineDefinition(conn, 'proj', 1)).rejects.toBeInstanceOf(
      AzureDevOpsAuthenticationError,
    );
  });

  it('wraps network errors in AzureDevOpsError', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('timeout')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(getPipelineDefinition(conn, 'proj', 1)).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
