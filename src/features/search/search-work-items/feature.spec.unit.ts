import { WebApi } from 'azure-devops-node-api';
import axios from 'axios';
import {
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsValidationError,
  AzureDevOpsPermissionError,
} from '../../../shared/errors';
import { searchWorkItems } from './feature';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

const mockConn = { serverUrl: 'https://ado/tfs/Col' } as unknown as WebApi;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.AZURE_DEVOPS_AUTH_METHOD = 'pat';
  process.env.AZURE_DEVOPS_PAT = 'test-token';
});

afterEach(() => {
  delete process.env.AZURE_DEVOPS_AUTH_METHOD;
  delete process.env.AZURE_DEVOPS_PAT;
});

describe('searchWorkItems', () => {
  it('returns search results on success', async () => {
    const mockResponse = { data: { count: 1, results: [{ id: { workItemId: 42 } }] } };
    mockAxios.post.mockResolvedValue(mockResponse);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockAxios as any).isAxiosError = jest.fn().mockReturnValue(false);

    const result = await searchWorkItems(mockConn, {
      searchText: 'bug',
      projectId: 'proj',
    });
    expect(result).toEqual(mockResponse.data);
  });

  it('throws AzureDevOpsResourceNotFoundError on 404', async () => {
    const axiosErr = { isAxiosError: true, response: { status: 404, data: { message: 'missing' } }, message: 'missing' };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;

    await expect(
      searchWorkItems(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('throws AzureDevOpsValidationError on 400', async () => {
    const axiosErr = { isAxiosError: true, response: { status: 400, data: { message: 'bad' } }, message: 'bad' };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;

    await expect(
      searchWorkItems(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsValidationError);
  });

  it('throws AzureDevOpsPermissionError on 403', async () => {
    const axiosErr = { isAxiosError: true, response: { status: 403, data: { message: 'denied' } }, message: 'denied' };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;

    await expect(
      searchWorkItems(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsPermissionError);
  });

  it('throws generic AzureDevOpsError on 500', async () => {
    const axiosErr = { isAxiosError: true, response: { status: 500, data: { message: 'err' } }, message: 'err' };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;

    await expect(
      searchWorkItems(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('rethrows AzureDevOpsError directly', async () => {
    const original = new AzureDevOpsValidationError('already typed');
    mockAxios.post.mockRejectedValue(original);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(false) as never;

    await expect(
      searchWorkItems(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBe(original);
  });

  it('wraps non-axios errors in AzureDevOpsError', async () => {
    mockAxios.post.mockRejectedValue(new Error('timeout'));
    mockAxios.isAxiosError = jest.fn().mockReturnValue(false) as never;

    await expect(
      searchWorkItems(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
