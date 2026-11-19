import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { updateWorkItem } from './feature';

function makeWitApi(workItem: unknown = { id: 1 }, currentTags = '') {
  return {
    getWorkItem: jest.fn().mockResolvedValue({
      id: 1,
      fields: { 'System.Tags': currentTags },
    }),
    updateWorkItem: jest.fn().mockResolvedValue(workItem),
  };
}

function makeConn(witApi: unknown) {
  return {
    getWorkItemTrackingApi: jest.fn().mockResolvedValue(witApi),
  } as unknown as WebApi;
}

describe('updateWorkItem', () => {
  it('throws when no fields provided', async () => {
    const conn = makeConn(makeWitApi());
    await expect(updateWorkItem(conn, 1, {})).rejects.toThrow(
      'At least one field must be provided',
    );
  });

  it('updates title', async () => {
    const updated = { id: 1, fields: { 'System.Title': 'New' } };
    const witApi = makeWitApi(updated);
    const conn = makeConn(witApi);
    const result = await updateWorkItem(conn, 1, { title: 'New' });
    expect(result).toEqual(updated);
    const doc: { path: string }[] = witApi.updateWorkItem.mock.calls[0][1];
    expect(doc.some((p) => p.path === '/fields/System.Title')).toBe(true);
  });

  it('updates all optional scalar fields', async () => {
    const witApi = makeWitApi({ id: 2 });
    const conn = makeConn(witApi);
    await updateWorkItem(conn, 2, {
      title: 'T',
      description: 'D',
      assignedTo: 'alice@test.com',
      areaPath: 'Area',
      iterationPath: 'Sprint 1',
      priority: 2,
      state: 'Active',
    });
    const doc: { path: string }[] = witApi.updateWorkItem.mock.calls[0][1];
    const paths = doc.map((p) => p.path);
    expect(paths).toContain('/fields/System.Description');
    expect(paths).toContain('/fields/System.AssignedTo');
    expect(paths).toContain('/fields/System.AreaPath');
    expect(paths).toContain('/fields/System.IterationPath');
    expect(paths).toContain('/fields/Microsoft.VSTS.Common.Priority');
    expect(paths).toContain('/fields/System.State');
  });

  it('replaces tags (op=replace) when item already has tags', async () => {
    const witApi = makeWitApi({ id: 1 }, 'old-tag');
    const conn = makeConn(witApi);
    await updateWorkItem(conn, 1, { tags: ['new-tag'] });
    const doc: { path: string; op: string; value: string }[] =
      witApi.updateWorkItem.mock.calls[0][1];
    const tagPatch = doc.find((p) => p.path === '/fields/System.Tags');
    expect(tagPatch?.op).toBe('replace');
    expect(tagPatch?.value).toBe('new-tag');
  });

  it('adds tags (op=add) when item has no tags', async () => {
    const witApi = makeWitApi({ id: 1 }, '');
    const conn = makeConn(witApi);
    await updateWorkItem(conn, 1, { tags: ['fresh'] });
    const doc: { path: string; op: string }[] =
      witApi.updateWorkItem.mock.calls[0][1];
    const tagPatch = doc.find((p) => p.path === '/fields/System.Tags');
    expect(tagPatch?.op).toBe('add');
  });

  it('adds and removes individual tags via tagsToAdd/tagsToRemove', async () => {
    const witApi = makeWitApi({ id: 1 }, 'keep; remove-me');
    const conn = makeConn(witApi);
    await updateWorkItem(conn, 1, {
      tagsToAdd: ['new-one'],
      tagsToRemove: ['remove-me'],
    });
    const doc: { path: string; value: string }[] =
      witApi.updateWorkItem.mock.calls[0][1];
    const tagPatch = doc.find((p) => p.path === '/fields/System.Tags');
    expect(tagPatch?.value).toContain('keep');
    expect(tagPatch?.value).toContain('new-one');
    expect(tagPatch?.value).not.toContain('remove-me');
  });

  it('applies additional fields', async () => {
    const witApi = makeWitApi({ id: 1 });
    const conn = makeConn(witApi);
    await updateWorkItem(conn, 1, {
      additionalFields: { 'Custom.MyField': 'value' },
    });
    const doc: { path: string }[] = witApi.updateWorkItem.mock.calls[0][1];
    expect(doc.some((p) => p.path === '/fields/Custom.MyField')).toBe(true);
  });

  it('throws ResourceNotFoundError when updateWorkItem returns null', async () => {
    const witApi = makeWitApi(null);
    const conn = makeConn(witApi);
    await expect(updateWorkItem(conn, 1, { title: 'x' })).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('throws ResourceNotFoundError when getWorkItem returns null for tags', async () => {
    const witApi = {
      getWorkItem: jest.fn().mockResolvedValue(null),
      updateWorkItem: jest.fn(),
    };
    const conn = makeConn(witApi);
    await expect(updateWorkItem(conn, 1, { tags: ['x'] })).rejects.toBeInstanceOf(
      AzureDevOpsResourceNotFoundError,
    );
  });

  it('wraps unknown errors', async () => {
    const witApi = {
      getWorkItem: jest.fn(),
      updateWorkItem: jest.fn().mockRejectedValue(new Error('server down')),
    };
    const conn = makeConn(witApi);
    await expect(updateWorkItem(conn, 1, { title: 'x' })).rejects.toThrow(
      'Failed to update work item',
    );
  });
});
