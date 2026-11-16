import { WebApi } from 'azure-devops-node-api';
import { getPipelineRunStageTasks } from './feature';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';

const makeRecord = (
  id: string,
  type: string,
  parentId?: string,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  type,
  parentId,
  name: `${type}-${id}`,
  displayName: `${type} ${id}`,
  state: 'completed',
  result: 'succeeded',
  order: 1,
  ...overrides,
});

describe('getPipelineRunStageTasks unit', () => {
  let mockConnection: WebApi;
  let mockBuildApi: any;
  let mockRestGet: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRestGet = jest.fn();
    mockBuildApi = {
      rest: { get: mockRestGet },
      createRequestOptions: jest
        .fn()
        .mockReturnValue({ acceptHeader: 'application/json' }),
    };
    mockConnection = {
      serverUrl: 'https://dev.azure.com/testorg',
      getBuildApi: jest.fn().mockResolvedValue(mockBuildApi),
    } as unknown as WebApi;
  });

  it('returns stages with jobs and tasks', async () => {
    const stageRecord = makeRecord('s1', 'Stage');
    const jobRecord = makeRecord('j1', 'Job', 's1');
    const taskRecord = makeRecord('t1', 'Task', 'j1', { log: { id: 5 } });

    mockRestGet.mockResolvedValue({
      statusCode: 200,
      result: { records: [stageRecord, jobRecord, taskRecord] },
    });

    const result = await getPipelineRunStageTasks(mockConnection, {
      projectId: 'my-project',
      runId: 101,
    });

    expect(result.runId).toBe(101);
    expect(result.stages).toHaveLength(1);
    expect(result.stages[0].name).toBe('Stage-s1');
    expect(result.stages[0].jobs).toHaveLength(1);
    expect(result.stages[0].jobs[0].name).toBe('Job-j1');
    expect(result.stages[0].jobs[0].tasks).toHaveLength(1);
    expect(result.stages[0].jobs[0].tasks[0].logId).toBe(5);
  });

  it('filters by stageName', async () => {
    const stage1 = makeRecord('s1', 'Stage', undefined, { name: 'Build' });
    const stage2 = makeRecord('s2', 'Stage', undefined, { name: 'Deploy' });
    const job1 = makeRecord('j1', 'Job', 's1');
    const job2 = makeRecord('j2', 'Job', 's2');
    const task1 = makeRecord('t1', 'Task', 'j1');
    const task2 = makeRecord('t2', 'Task', 'j2');

    mockRestGet.mockResolvedValue({
      statusCode: 200,
      result: { records: [stage1, stage2, job1, job2, task1, task2] },
    });

    const result = await getPipelineRunStageTasks(mockConnection, {
      projectId: 'p',
      runId: 1,
      stageName: 'Build',
    });

    expect(result.stages).toHaveLength(1);
    expect(result.stages[0].name).toBe('Build');
  });

  it('filters by jobName', async () => {
    const stage = makeRecord('s1', 'Stage');
    const job1 = makeRecord('j1', 'Job', 's1', { name: 'UnitTests' });
    const job2 = makeRecord('j2', 'Job', 's1', { name: 'IntegTests' });
    const task1 = makeRecord('t1', 'Task', 'j1');
    const task2 = makeRecord('t2', 'Task', 'j2');

    mockRestGet.mockResolvedValue({
      statusCode: 200,
      result: { records: [stage, job1, job2, task1, task2] },
    });

    const result = await getPipelineRunStageTasks(mockConnection, {
      projectId: 'p',
      runId: 1,
      jobName: 'UnitTests',
    });

    expect(result.stages[0].jobs).toHaveLength(1);
    expect(result.stages[0].jobs[0].name).toBe('UnitTests');
    expect(result.stages[0].jobs[0].tasks).toHaveLength(1);
  });

  it('maps numeric state and result to strings', async () => {
    const stage = makeRecord('s1', 'Stage', undefined, {
      state: 2,
      result: 0,
    });
    const job = makeRecord('j1', 'Job', 's1', { state: 2, result: 0 });
    const task = makeRecord('t1', 'Task', 'j1', { state: 2, result: 0 });

    mockRestGet.mockResolvedValue({
      statusCode: 200,
      result: { records: [stage, job, task] },
    });

    const result = await getPipelineRunStageTasks(mockConnection, {
      projectId: 'p',
      runId: 1,
    });

    expect(result.stages[0].state).toBe('completed');
    expect(result.stages[0].result).toBe('succeeded');
    expect(result.stages[0].jobs[0].tasks[0].state).toBe('completed');
    expect(result.stages[0].jobs[0].tasks[0].result).toBe('succeeded');
  });

  it('throws AzureDevOpsResourceNotFoundError on 404', async () => {
    mockRestGet.mockResolvedValue({ statusCode: 404, result: null });

    await expect(
      getPipelineRunStageTasks(mockConnection, {
        projectId: 'p',
        runId: 1,
      }),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('throws AzureDevOpsAuthenticationError on 401', async () => {
    mockRestGet.mockRejectedValue(new Error('401 Unauthorized'));

    await expect(
      getPipelineRunStageTasks(mockConnection, { projectId: 'p', runId: 1 }),
    ).rejects.toBeInstanceOf(AzureDevOpsAuthenticationError);
  });

  it('wraps unexpected errors in AzureDevOpsError', async () => {
    mockRestGet.mockRejectedValue(new Error('Kaboom'));

    await expect(
      getPipelineRunStageTasks(mockConnection, { projectId: 'p', runId: 1 }),
    ).rejects.toBeInstanceOf(AzureDevOpsError);
  });

  it('returns empty stages when timeline has no stage records', async () => {
    mockRestGet.mockResolvedValue({
      statusCode: 200,
      result: { records: [] },
    });

    const result = await getPipelineRunStageTasks(mockConnection, {
      projectId: 'p',
      runId: 1,
    });

    expect(result.stages).toHaveLength(0);
  });

  it('sorts tasks by order within a job', async () => {
    const stage = makeRecord('s1', 'Stage');
    const job = makeRecord('j1', 'Job', 's1');
    const task1 = makeRecord('t1', 'Task', 'j1', { order: 2 });
    const task2 = makeRecord('t2', 'Task', 'j1', { order: 1 });

    mockRestGet.mockResolvedValue({
      statusCode: 200,
      result: { records: [stage, job, task1, task2] },
    });

    const result = await getPipelineRunStageTasks(mockConnection, {
      projectId: 'p',
      runId: 1,
    });

    const tasks = result.stages[0].jobs[0].tasks;
    expect(tasks[0].id).toBe('t2');
    expect(tasks[1].id).toBe('t1');
  });
});
