import { WebApi } from 'azure-devops-node-api';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { isBuildsRequest, handleBuildsRequest } from './index';
import { getBuildDetails } from './get-build-details/feature';
import { getBuildTimeline } from './get-build-timeline/feature';
import { getFailedTasks } from './get-failed-tasks/feature';
import { getTaskLog } from './get-task-log/feature';
import { getBuildLogs } from './get-build-logs/feature';
import { compareBuilds } from './compare-builds/feature';
import { getBuildChanges } from './get-build-changes/feature';
import { searchFailedBuilds } from './search-failed-builds/feature';
import { getLastSuccessfulBuild } from './get-last-successful-build/feature';
import { compareFailedSuccessfulBuilds } from './compare-failed-successful-builds/feature';

jest.mock('./get-build-details/feature');
jest.mock('./get-build-timeline/feature');
jest.mock('./get-failed-tasks/feature');
jest.mock('./get-task-log/feature');
jest.mock('./get-build-logs/feature');
jest.mock('./compare-builds/feature');
jest.mock('./get-build-changes/feature');
jest.mock('./search-failed-builds/feature');
jest.mock('./get-last-successful-build/feature');
jest.mock('./compare-failed-successful-builds/feature');

const mockConnection = {} as WebApi;

function makeRequest(name: string, args: Record<string, unknown> = {}): CallToolRequest {
  return {
    params: { name, arguments: args },
    method: 'tools/call',
  } as CallToolRequest;
}

describe('isBuildsRequest', () => {
  it('returns true for all build tool names', () => {
    const tools = [
      'get_build_details',
      'get_build_timeline',
      'get_failed_tasks',
      'get_task_log',
      'get_build_logs',
      'compare_builds',
      'get_build_changes',
      'search_failed_builds',
      'get_last_successful_build',
      'compare_failed_successful_builds',
    ];
    for (const tool of tools) {
      expect(isBuildsRequest(makeRequest(tool))).toBe(true);
    }
  });

  it('returns false for unrelated tool names', () => {
    expect(isBuildsRequest(makeRequest('list_pipelines'))).toBe(false);
    expect(isBuildsRequest(makeRequest('get_project'))).toBe(false);
  });
});

describe('handleBuildsRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('handles get_build_details', async () => {
    const mockBuild = { id: 42, buildNumber: '20240101.1', status: 'completed' };
    (getBuildDetails as jest.Mock).mockResolvedValue(mockBuild);
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('get_build_details', { projectId: 'proj', buildId: 42 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockBuild);
    expect(getBuildDetails).toHaveBeenCalledWith(mockConnection, 'proj', 42);
  });

  it('handles get_build_timeline', async () => {
    const mockTimeline = { id: 'tl1', records: [] };
    (getBuildTimeline as jest.Mock).mockResolvedValue(mockTimeline);
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('get_build_timeline', { projectId: 'proj', buildId: 42 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockTimeline);
  });

  it('handles get_failed_tasks', async () => {
    const mockFailed = [{ name: 'Build', result: 'failed' }];
    (getFailedTasks as jest.Mock).mockResolvedValue(mockFailed);
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('get_failed_tasks', { projectId: 'proj', buildId: 42 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockFailed);
  });

  it('handles get_task_log and returns plain text', async () => {
    (getTaskLog as jest.Mock).mockResolvedValue('line1\nline2');
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('get_task_log', { projectId: 'proj', buildId: 42, logId: 1 }),
    );
    expect(res.content[0].text).toBe('line1\nline2');
  });

  it('handles get_build_logs', async () => {
    const mockLogs = [{ id: 1, type: 'Container', lineCount: 100 }];
    (getBuildLogs as jest.Mock).mockResolvedValue(mockLogs);
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('get_build_logs', { projectId: 'proj', buildId: 42 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockLogs);
  });

  it('handles compare_builds', async () => {
    const mockResult = { build1: { id: 1 }, build2: { id: 2 }, differences: [] };
    (compareBuilds as jest.Mock).mockResolvedValue(mockResult);
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('compare_builds', { projectId: 'proj', buildId1: 1, buildId2: 2 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockResult);
  });

  it('handles get_build_changes', async () => {
    const mockChanges = [{ id: 'abc123', message: 'fix: bug' }];
    (getBuildChanges as jest.Mock).mockResolvedValue(mockChanges);
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('get_build_changes', { projectId: 'proj', buildId: 42 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockChanges);
  });

  it('handles search_failed_builds', async () => {
    const mockBuilds = [{ id: 10, result: 'failed' }];
    (searchFailedBuilds as jest.Mock).mockResolvedValue(mockBuilds);
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('search_failed_builds', { projectId: 'proj', top: 10 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockBuilds);
  });

  it('handles get_last_successful_build when build exists', async () => {
    const mockBuild = { id: 5, result: 'succeeded' };
    (getLastSuccessfulBuild as jest.Mock).mockResolvedValue(mockBuild);
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('get_last_successful_build', { projectId: 'proj', definitionId: 1 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockBuild);
  });

  it('handles get_last_successful_build when no build found', async () => {
    (getLastSuccessfulBuild as jest.Mock).mockResolvedValue(null);
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('get_last_successful_build', { projectId: 'proj', definitionId: 1 }),
    );
    expect(res.content[0].text).toBe('No successful build found');
  });

  it('handles compare_failed_successful_builds', async () => {
    const mockResult = {
      failedBuild: { id: 10 },
      lastSuccessfulBuild: { id: 9 },
      differences: [],
      changesInFailedBuild: [],
    };
    (compareFailedSuccessfulBuilds as jest.Mock).mockResolvedValue(mockResult);
    const res = await handleBuildsRequest(
      mockConnection,
      makeRequest('compare_failed_successful_builds', {
        projectId: 'proj',
        failedBuildId: 10,
      }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockResult);
  });

  it('throws for unknown tool names', async () => {
    await expect(
      handleBuildsRequest(mockConnection, makeRequest('nonexistent_tool')),
    ).rejects.toThrow('Unknown builds tool');
  });
});
