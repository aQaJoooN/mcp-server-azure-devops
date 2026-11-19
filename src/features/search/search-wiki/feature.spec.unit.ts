import { WebApi } from 'azure-devops-node-api';
import axios from 'axios';
import {
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsValidationError,
  AzureDevOpsPermissionError,
} from '../../../shared/errors';
import { searchWiki } from './feature';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

const mockConn = {
  serverUrl: 'https://ado/tfs/Col',
} as unknown as WebApi;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.AZURE_DEVOPS_AUTH_METHOD = 'pat';
  process.env.AZURE_DEVOPS_PAT = 'test-token';
});

afterEach(() => {
  delete process.env.AZURE_DEVOPS_AUTH_METHOD;
  delete process.env.AZURE_DEVOPS_PAT;
});

describe('searchWiki', () => {
  it('returns search results on success', async () => {
    const mockResponse = {
      data: {
        count: 1,
        results: [{ fileName: 'page.md', path: '/docs/page' }],
      },
    };
    mockAxios.post.mockResolvedValue(mockResponse);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockAxios as any).isAxiosError = jest.fn().mockReturnValue(false);

    const result = await searchWiki(mockConn, {
      searchText: 'hello',
      projectId: 'proj',
    });
    expect(result).toEqual(mockResponse.data);
    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('wikisearchresults'),
      expect.objectContaining({ searchText: 'hello' }),
      expect.any(Object),
    );
  });

  it('applies additional project filters', async () => {
    const mockResponse = { data: { count: 0, results: [] } };
    mockAxios.post.mockResolvedValue(mockResponse);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockAxios as any).isAxiosError = jest.fn().mockReturnValue(false);

    await searchWiki(mockConn, {
      searchText: 'test',
      projectId: 'proj',
      filters: { Project: ['extra-proj'] },
    });
    expect(mockAxios.post).toHaveBeenCalled();
  });

  it('throws AzureDevOpsResourceNotFoundError on axios 404', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 404, data: { message: 'not found' } },
      message: 'not found',
    };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;

    await expect(
      searchWiki(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('throws AzureDevOpsValidationError on axios 400', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 400, data: { message: 'bad' } },
      message: 'bad',
    };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;

    await expect(
      searchWiki(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsValidationError);
  });

  it('throws AzureDevOpsPermissionError on axios 401', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 401, data: { message: 'denied' } },
      message: 'denied',
    };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;

    await expect(
      searchWiki(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsPermissionError);
  });

  it('throws generic AzureDevOpsError on other axios error', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 500, data: { message: 'server' } },
      message: 'server',
    };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;

    await expect(
      searchWiki(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('rethrows AzureDevOpsError directly', async () => {
    const original = new AzureDevOpsValidationError('already typed');
    mockAxios.post.mockRejectedValue(original);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(false) as never;

    await expect(
      searchWiki(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBe(original);
  });

  it('wraps non-axios errors in AzureDevOpsError', async () => {
    mockAxios.post.mockRejectedValue(new Error('network'));
    mockAxios.isAxiosError = jest.fn().mockReturnValue(false) as never;

    await expect(
      searchWiki(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
