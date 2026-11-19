import { WebApi } from 'azure-devops-node-api';
import { createWorkItem } from './feature';

function makeConn(workItem: unknown) {
  const witApi = { createWorkItem: jest.fn().mockResolvedValue(workItem) };
  return {
    getWorkItemTrackingApi: jest.fn().mockResolvedValue(witApi),
    serverUrl: 'https://ado/tfs/Col',
  } as unknown as WebApi;
}

describe('createWorkItem', () => {
  it('throws when title is missing', async () => {
    const conn = makeConn(null);
    await expect(
      createWorkItem(conn, 'proj', 'Task', { title: '' }),
    ).rejects.toThrow('Title is required');
  });

  it('creates work item with required title', async () => {
    const mockWI = { id: 1, fields: { 'System.Title': 'My Task' } };
    const conn = makeConn(mockWI);
    const result = await createWorkItem(conn, 'proj', 'Task', {
      title: 'My Task',
    });
    expect(result).toEqual(mockWI);
  });

  it('throws when API returns null', async () => {
    const conn = makeConn(null);
    await expect(
      createWorkItem(conn, 'proj', 'Task', { title: 'Test' }),
    ).rejects.toThrow('Failed to create work item');
  });

  it('builds full patch document with all optional fields', async () => {
    const mockWI = { id: 2 };
    const witApi = { createWorkItem: jest.fn().mockResolvedValue(mockWI) };
    const conn = {
      getWorkItemTrackingApi: jest.fn().mockResolvedValue(witApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;

    await createWorkItem(conn, 'proj', 'Bug', {
      title: 'Fix bug',
      description: 'Steps to reproduce',
      assignedTo: 'alice@test.com',
      areaPath: 'MyProject\\Area',
      iterationPath: 'Sprint 1',
      priority: 1,
      parentId: 100,
      tags: ['critical', 'backend'],
      additionalFields: { 'Custom.Field': 'value' },
    });

    const patchDoc: { path: string; value: unknown }[] =
      witApi.createWorkItem.mock.calls[0][1];
    const paths = patchDoc.map((p) => p.path);

    expect(paths).toContain('/fields/System.Title');
    expect(paths).toContain('/fields/System.Description');
    expect(paths).toContain('/fields/System.AssignedTo');
    expect(paths).toContain('/fields/System.AreaPath');
    expect(paths).toContain('/fields/System.IterationPath');
    expect(paths).toContain('/fields/Microsoft.VSTS.Common.Priority');
    expect(paths).toContain('/relations/-');
    expect(paths).toContain('/fields/System.Tags');
    expect(paths).toContain('/fields/Custom.Field');

    const tagsEntry = patchDoc.find((p) => p.path === '/fields/System.Tags');
    expect(tagsEntry?.value).toBe('critical; backend');
  });

  it('wraps API errors', async () => {
    const witApi = {
      createWorkItem: jest.fn().mockRejectedValue(new Error('server error')),
    };
    const conn = {
      getWorkItemTrackingApi: jest.fn().mockResolvedValue(witApi),
      serverUrl: 'https://ado/tfs/Col',
    } as unknown as WebApi;
    await expect(
      createWorkItem(conn, 'proj', 'Task', { title: 'x' }),
    ).rejects.toThrow('Failed to create work item');
  });
});
