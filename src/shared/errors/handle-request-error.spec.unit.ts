import axios from 'axios';
import {
  handleRequestError,
  handleResponseError,
} from './handle-request-error';
import {
  AzureDevOpsError,
  AzureDevOpsValidationError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsPermissionError,
  AzureDevOpsResourceNotFoundError,
} from './azure-devops-errors';

describe('handleRequestError', () => {
  it('rethrows AzureDevOpsError as-is', () => {
    const original = new AzureDevOpsResourceNotFoundError('not found');
    expect(() => handleRequestError(original, 'testing')).toThrow(original);
  });

  it('converts axios 400 to AzureDevOpsValidationError', () => {
    const axiosErr = new axios.AxiosError('bad request', '400', undefined, undefined, {
      status: 400,
      data: { message: 'invalid field' },
    } as never);
    expect(() => handleRequestError(axiosErr, 'creating item')).toThrow(AzureDevOpsValidationError);
  });

  it('converts axios 401 to AzureDevOpsAuthenticationError', () => {
    const axiosErr = new axios.AxiosError('unauthorized', '401', undefined, undefined, {
      status: 401,
      data: { message: 'token expired' },
    } as never);
    expect(() => handleRequestError(axiosErr, 'creating item')).toThrow(AzureDevOpsAuthenticationError);
  });

  it('converts axios 403 to AzureDevOpsPermissionError', () => {
    const axiosErr = new axios.AxiosError('forbidden', '403', undefined, undefined, {
      status: 403,
      data: { message: 'access denied' },
    } as never);
    expect(() => handleRequestError(axiosErr, 'creating item')).toThrow(AzureDevOpsPermissionError);
  });

  it('converts axios 404 to AzureDevOpsResourceNotFoundError', () => {
    const axiosErr = new axios.AxiosError('not found', '404', undefined, undefined, {
      status: 404,
      data: { message: 'resource missing' },
    } as never);
    expect(() => handleRequestError(axiosErr, 'fetching item')).toThrow(AzureDevOpsResourceNotFoundError);
  });

  it('converts axios unknown status to AzureDevOpsError', () => {
    const axiosErr = new axios.AxiosError('server error', '500', undefined, undefined, {
      status: 500,
      data: { message: 'internal error' },
    } as never);
    expect(() => handleRequestError(axiosErr, 'fetching item')).toThrow(AzureDevOpsError);
  });

  it('wraps plain Error in AzureDevOpsError', () => {
    expect(() => handleRequestError(new Error('plain'), 'doing thing')).toThrow(AzureDevOpsError);
  });

  it('wraps non-Error value in AzureDevOpsError', () => {
    expect(() => handleRequestError('string error', 'doing thing')).toThrow(AzureDevOpsError);
  });
});

describe('handleResponseError', () => {
  it('returns isError:true with text content for plain Error', () => {
    const result = handleResponseError(new Error('something broke'));
    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('something broke');
  });

  it('returns formatted message for AzureDevOpsResourceNotFoundError', () => {
    const result = handleResponseError(new AzureDevOpsResourceNotFoundError('item missing'));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('item missing');
  });

  it('returns formatted message for AzureDevOpsAuthenticationError', () => {
    const result = handleResponseError(new AzureDevOpsAuthenticationError('bad token'));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('bad token');
  });

  it('returns formatted message for AzureDevOpsValidationError', () => {
    const result = handleResponseError(new AzureDevOpsValidationError('invalid input'));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('invalid input');
  });

  it('appends location hint on API location failure', () => {
    const result = handleResponseError(new Error('Failed to find api location for the area'));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('AZURE_DEVOPS_ORG_URL');
  });

  it('handles errors with cause', () => {
    const cause = new Error('root cause');
    const err = new AzureDevOpsError('outer', { cause });
    const result = handleResponseError(err);
    expect(result.isError).toBe(true);
  });

  it('handles non-Error values', () => {
    const result = handleResponseError('a string error');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('a string error');
  });
});
