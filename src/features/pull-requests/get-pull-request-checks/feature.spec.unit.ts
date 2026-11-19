import { WebApi } from 'azure-devops-node-api';
import { AzureDevOpsResourceNotFoundError } from '../../../shared/errors';
import { getPullRequestChecks } from './feature';

function makeConn(statusRecords: unknown[], evaluations: unknown[], projectId = 'proj-guid-1234') {
  const gitApi = {
    getPullRequestStatuses: jest.fn().mockResolvedValue(statusRecords),
  };
  const policyApi = {
    getPolicyEvaluations: jest.fn().mockResolvedValue(evaluations),
  };
  const coreApi = {
    getProject: jest.fn().mockResolvedValue({ id: projectId }),
  };
  return {
    getGitApi: jest.fn().mockResolvedValue(gitApi),
    getPolicyApi: jest.fn().mockResolvedValue(policyApi),
    getCoreApi: jest.fn().mockResolvedValue(coreApi),
  } as unknown as WebApi;
}

describe('getPullRequestChecks', () => {
  it('returns empty arrays when no statuses or evaluations', async () => {
    const conn = makeConn([], []);
    const result = await getPullRequestChecks(conn, {
      projectId: '11111111-1111-1111-1111-111111111111',
      repositoryId: 'repo-1',
      pullRequestId: 42,
    });
    expect(result.statuses).toHaveLength(0);
    expect(result.policyEvaluations).toHaveLength(0);
  });

  it('maps status records correctly', async () => {
    const statusRecords = [
      {
        id: 1,
        state: 2, // succeeded
        description: 'Build passed',
        context: { name: 'ci/build', genre: 'continuous-integration' },
        targetUrl: 'https://ado/build/1',
        creationDate: new Date('2024-01-01'),
        updatedDate: new Date('2024-01-02'),
      },
    ];
    const conn = makeConn(statusRecords, []);
    const result = await getPullRequestChecks(conn, {
      projectId: '11111111-1111-1111-1111-111111111111',
      repositoryId: 'repo-1',
      pullRequestId: 1,
    });
    expect(result.statuses[0].description).toBe('Build passed');
    expect(result.statuses[0].context?.name).toBe('ci/build');
  });

  it('maps policy evaluations correctly', async () => {
    const evaluations = [
      {
        evaluationId: 'eval-1',
        status: 1, // approved
        configuration: {
          isBlocking: true,
          isEnabled: true,
          id: 100,
          revision: 1,
          type: { id: 'type-1', displayName: 'Minimum reviewers' },
          settings: { displayName: 'Requires 2 reviewers' },
        },
        context: {},
        startedDate: new Date('2024-01-01'),
        completedDate: new Date('2024-01-02'),
      },
    ];
    const conn = makeConn([], evaluations);
    const result = await getPullRequestChecks(conn, {
      projectId: '11111111-1111-1111-1111-111111111111',
      repositoryId: 'repo-1',
      pullRequestId: 1,
    });
    expect(result.policyEvaluations[0].evaluationId).toBe('eval-1');
    expect(result.policyEvaluations[0].isBlocking).toBe(true);
    expect(result.policyEvaluations[0].configurationTypeDisplayName).toBe('Minimum reviewers');
  });

  it('resolves project name to ID via coreApi', async () => {
    const conn = makeConn([], [], 'resolved-guid');
    const result = await getPullRequestChecks(conn, {
      projectId: 'my-project-name', // not a GUID, needs resolution
      repositoryId: 'repo-1',
      pullRequestId: 1,
    });
    expect(result.statuses).toBeDefined();
  });

  it('throws ResourceNotFoundError when project name not found', async () => {
    const gitApi = { getPullRequestStatuses: jest.fn().mockResolvedValue([]) };
    const policyApi = { getPolicyEvaluations: jest.fn().mockResolvedValue([]) };
    const coreApi = { getProject: jest.fn().mockResolvedValue(null) };
    const conn = {
      getGitApi: jest.fn().mockResolvedValue(gitApi),
      getPolicyApi: jest.fn().mockResolvedValue(policyApi),
      getCoreApi: jest.fn().mockResolvedValue(coreApi),
    } as unknown as WebApi;
    await expect(
      getPullRequestChecks(conn, { projectId: 'missing-project', repositoryId: 'r', pullRequestId: 1 }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('wraps unknown errors', async () => {
    const conn = {
      getGitApi: jest.fn().mockRejectedValue(new Error('connection reset')),
      getPolicyApi: jest.fn().mockResolvedValue({}),
      getCoreApi: jest.fn().mockResolvedValue({}),
    } as unknown as WebApi;
    await expect(
      getPullRequestChecks(conn, {
        projectId: '11111111-1111-1111-1111-111111111111',
        repositoryId: 'r', pullRequestId: 1,
      }),
    ).rejects.toThrow('Failed to get pull request checks');
  });

  it('handles null status and evaluation lists', async () => {
    const gitApi = { getPullRequestStatuses: jest.fn().mockResolvedValue(null) };
    const policyApi = { getPolicyEvaluations: jest.fn().mockResolvedValue(null) };
    const conn = {
      getGitApi: jest.fn().mockResolvedValue(gitApi),
      getPolicyApi: jest.fn().mockResolvedValue(policyApi),
      getCoreApi: jest.fn().mockResolvedValue({ getProject: jest.fn().mockResolvedValue({ id: 'g' }) }),
    } as unknown as WebApi;
    const result = await getPullRequestChecks(conn, {
      projectId: 'my-project', repositoryId: 'r', pullRequestId: 1,
    });
    expect(result.statuses).toHaveLength(0);
    expect(result.policyEvaluations).toHaveLength(0);
  });
});
