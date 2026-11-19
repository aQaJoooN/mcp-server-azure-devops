import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { compareFailedSuccessfulBuilds } from './feature';

jest.mock('../get-build-details/feature');
jest.mock('../get-last-successful-build/feature');
jest.mock('../get-build-changes/feature');

import { getBuildDetails } from '../get-build-details/feature';
import { getLastSuccessfulBuild } from '../get-last-successful-build/feature';
import { getBuildChanges } from '../get-build-changes/feature';

const mockConn = {} as WebApi;

describe('compareFailedSuccessfulBuilds', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns comparison with differences when successful build exists', async () => {
    const failedBuild = {
      id: 10,
      buildNumber: '2.0',
      result: 'failed',
      sourceBranch: 'main',
      definition: { id: 1 },
    };
    const successfulBuild = {
      id: 9,
      buildNumber: '1.9',
      result: 'succeeded',
      sourceBranch: 'main',
      definition: { id: 1 },
    };
    const changes = [{ id: 'abc', message: 'breaking change' }];

    (getBuildDetails as jest.Mock).mockResolvedValue(failedBuild);
    (getLastSuccessfulBuild as jest.Mock).mockResolvedValue(successfulBuild);
    (getBuildChanges as jest.Mock).mockResolvedValue(changes);

    const result = await compareFailedSuccessfulBuilds(mockConn, 'proj', 10);

    expect(result.failedBuild).toEqual(failedBuild);
    expect(result.lastSuccessfulBuild).toEqual(successfulBuild);
    expect(result.changesInFailedBuild).toEqual(changes);
    expect(result.differences.some((d) => d.field === 'result')).toBe(true);
    expect(result.differences.some((d) => d.field === 'buildNumber')).toBe(
      true,
    );
  });

  it('returns empty differences when no successful build found', async () => {
    const failedBuild = { id: 11, definition: { id: 2 }, sourceBranch: 'main' };
    (getBuildDetails as jest.Mock).mockResolvedValue(failedBuild);
    (getLastSuccessfulBuild as jest.Mock).mockResolvedValue(null);
    (getBuildChanges as jest.Mock).mockResolvedValue([]);

    const result = await compareFailedSuccessfulBuilds(mockConn, 'proj', 11);
    expect(result.lastSuccessfulBuild).toBeNull();
    expect(result.differences).toHaveLength(0);
  });

  it('uses provided definitionId over inferred one', async () => {
    const failedBuild = { id: 12, definition: { id: 5 }, sourceBranch: 'main' };
    (getBuildDetails as jest.Mock).mockResolvedValue(failedBuild);
    (getLastSuccessfulBuild as jest.Mock).mockResolvedValue(null);
    (getBuildChanges as jest.Mock).mockResolvedValue([]);

    await compareFailedSuccessfulBuilds(mockConn, 'proj', 12, 99, 'feature');
    expect(getLastSuccessfulBuild).toHaveBeenCalledWith(
      mockConn,
      'proj',
      99,
      'feature',
    );
  });

  it('throws ResourceNotFoundError when definition ID cannot be determined', async () => {
    const failedBuild = { id: 13, definition: undefined };
    (getBuildDetails as jest.Mock).mockResolvedValue(failedBuild);

    await expect(
      compareFailedSuccessfulBuilds(mockConn, 'proj', 13),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('propagates AzureDevOpsError from getBuildDetails', async () => {
    const original = new AzureDevOpsResourceNotFoundError('build not found');
    (getBuildDetails as jest.Mock).mockRejectedValue(original);

    await expect(
      compareFailedSuccessfulBuilds(mockConn, 'proj', 99),
    ).rejects.toBe(original);
  });

  it('wraps unknown errors in AzureDevOpsError', async () => {
    (getBuildDetails as jest.Mock).mockRejectedValue(
      new Error('connection reset'),
    );

    await expect(
      compareFailedSuccessfulBuilds(mockConn, 'proj', 99),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });
});
