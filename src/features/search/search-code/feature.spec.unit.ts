import { WebApi } from 'azure-devops-node-api';
import axios from 'axios';
import {
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsValidationError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsPermissionError,
} from '../../../shared/errors';
import { searchCode } from './feature';

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

describe('searchCode', () => {
  it('throws validation error when projectId is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockAxios as any).isAxiosError = jest.fn().mockReturnValue(false);
    await expect(
      searchCode(mockConn, { searchText: 'test' } as never),
    ).rejects.toBeInstanceOf(AzureDevOpsValidationError);
  });

  it('returns search results on success', async () => {
    const mockData = {
      count: 1,
      results: [
        {
          path: '/src/app.ts',
          repository: { id: 'r1' },
          project: { name: 'proj' },
          versions: [],
        },
      ],
    };
    mockAxios.post.mockResolvedValue({ data: mockData });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockAxios as any).isAxiosError = jest.fn().mockReturnValue(false);
    const result = await searchCode(mockConn, {
      searchText: 'function',
      projectId: 'proj',
    });
    expect(result).toEqual(mockData);
  });

  it('limits top to 10 when includeContent is true', async () => {
    mockAxios.post.mockResolvedValue({ data: { count: 0, results: [] } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockAxios as any).isAxiosError = jest.fn().mockReturnValue(false);
    await searchCode(mockConn, {
      searchText: 'x',
      projectId: 'proj',
      top: 50,
      includeContent: true,
    });
    const requestBody = mockAxios.post.mock.calls[0][1] as { $top: number };
    expect(requestBody.$top).toBe(10);
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 404 },
      message: 'not found',
    };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;
    await expect(
      searchCode(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('throws ValidationError on 400', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 400, data: {} },
      message: 'bad',
    };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;
    await expect(
      searchCode(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsValidationError);
  });

  it('throws AuthenticationError on 401', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 401 },
      message: 'unauth',
    };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;
    await expect(
      searchCode(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });

  it('throws PermissionError on 403', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 403 },
      message: 'denied',
    };
    mockAxios.post.mockRejectedValue(axiosErr);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true) as never;
    await expect(
      searchCode(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsPermissionError);
  });

  it('throws generic AzureDevOpsError on other errors', async () => {
    mockAxios.post.mockRejectedValue(new Error('network'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockAxios as any).isAxiosError = jest.fn().mockReturnValue(false);
    await expect(
      searchCode(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('rethrows AzureDevOpsError directly', async () => {
    const original = new AzureDevOpsValidationError('already typed');
    mockAxios.post.mockRejectedValue(original);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockAxios as any).isAxiosError = jest.fn().mockReturnValue(false);
    await expect(
      searchCode(mockConn, { searchText: 'x', projectId: 'proj' }),
    ).rejects.toBe(original);
  });
});
