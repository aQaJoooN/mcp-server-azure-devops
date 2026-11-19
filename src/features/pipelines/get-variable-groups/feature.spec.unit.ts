import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getVariableGroups } from './feature';

function makeConn(statusCode: number, result: unknown) {
  const rest = { get: jest.fn().mockResolvedValue({ statusCode, result }) };
  const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
  return {
    getBuildApi: jest.fn().mockResolvedValue(buildApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('getVariableGroups', () => {
  it('returns groups with secrets masked', async () => {
    const rawGroups = {
      count: 1,
      value: [
        {
          id: 1,
          name: 'MyGroup',
          variables: {
            MY_VAR: { value: 'hello', isSecret: false },
            SECRET_VAR: { value: 'shh', isSecret: true },
            NORMAL: { value: 'world' },
          },
        },
      ],
    };
    const conn = makeConn(200, rawGroups);
    const result = await getVariableGroups(conn, 'proj');
    expect(result[0].variables?.MY_VAR?.value).toBe('hello');
    expect(result[0].variables?.SECRET_VAR?.value).toBe('<secret>');
    expect(result[0].variables?.SECRET_VAR?.isSecret).toBe(true);
    expect(result[0].variables?.NORMAL?.value).toBe('world');
  });

  it('applies optional groupName and top', async () => {
    const rest = { get: jest.fn().mockResolvedValue({ statusCode: 200, result: { count: 0, value: [] } }) };
    const buildApi = { createRequestOptions: jest.fn().mockReturnValue({}), rest };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await getVariableGroups(conn, 'proj', 'SharedVars', 10);
    const calledUrl: string = rest.get.mock.calls[0][0];
    expect(calledUrl).toContain('groupName=SharedVars');
    expect(calledUrl).toContain('%24top=10');
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const conn = makeConn(404, null);
    await expect(getVariableGroups(conn, 'proj')).rejects.toBeInstanceOf(
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
    await expect(getVariableGroups(conn, 'proj')).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });

  it('throws ResourceNotFoundError on "not found" message', async () => {
    const buildApi = {
      createRequestOptions: jest.fn().mockReturnValue({}),
      rest: { get: jest.fn().mockRejectedValue(new Error('not found')) },
    };
    const conn = {
      getBuildApi: jest.fn().mockResolvedValue(buildApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(getVariableGroups(conn, 'proj')).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
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
    await expect(getVariableGroups(conn, 'proj')).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('handles groups without variables', async () => {
    const conn = makeConn(200, { count: 1, value: [{ id: 2, name: 'EmptyGroup' }] });
    const result = await getVariableGroups(conn, 'proj');
    expect(result[0].variables).toBeUndefined();
  });
});
