import { WebApi } from 'azure-devops-node-api';
import { AzureDevOpsResourceNotFoundError } from '../../../shared/errors';
import { getWorkItem } from './feature';

function makeWitApi(workItem: unknown, typeFields: unknown = []) {
  return {
    getWorkItem: jest.fn().mockResolvedValue(workItem),
    getWorkItemTypeFieldsWithReferences: jest.fn().mockResolvedValue(typeFields),
  };
}

function makeConn(witApi: unknown) {
  return {
    getWorkItemTrackingApi: jest.fn().mockResolvedValue(witApi),
  } as unknown as WebApi;
}

describe('getWorkItem', () => {
  it('returns null work item as ResourceNotFoundError', async () => {
    const conn = makeConn(makeWitApi(null));
    await expect(getWorkItem(conn, 42)).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });

  it('returns work item when no project/type info available', async () => {
    const workItem = { id: 1, fields: {} };
    const conn = makeConn(makeWitApi(workItem));
    const result = await getWorkItem(conn, 1);
    expect(result).toEqual(workItem);
  });

  it('enhances work item with all type fields', async () => {
    const workItem = {
      id: 10,
      fields: {
        'System.TeamProject': 'MyProject',
        'System.WorkItemType': 'Bug',
        'System.Title': 'Test bug',
      },
    };
    const typeFields = [
      { referenceName: 'System.Title', defaultValue: null },
      { referenceName: 'System.State', defaultValue: 'New' },
      { referenceName: 'System.AssignedTo', defaultValue: null },
    ];
    const conn = makeConn(makeWitApi(workItem, typeFields));
    const result = await getWorkItem(conn, 10);
    // existing field preserved
    expect(result.fields?.['System.Title']).toBe('Test bug');
    // missing field filled with default
    expect(result.fields?.['System.State']).toBe('New');
    expect(result.fields?.['System.AssignedTo']).toBeNull();
  });

  it('uses expand map correctly for different expand values', async () => {
    const workItem = { id: 5, fields: {} };
    const witApi = makeWitApi(workItem);
    const conn = makeConn(witApi);
    await getWorkItem(conn, 5, 'relations');
    expect(witApi.getWorkItem).toHaveBeenCalledWith(5, undefined, undefined, expect.any(Number));
  });

  it('wraps unknown errors', async () => {
    const witApi = {
      getWorkItem: jest.fn().mockRejectedValue(new Error('connection reset')),
    };
    const conn = makeConn(witApi);
    await expect(getWorkItem(conn, 99)).rejects.toThrow('Failed to get work item');
  });

  it('uses cached type fields on second call', async () => {
    const workItem = {
      id: 11,
      fields: {
        'System.TeamProject': 'ProjectA',
        'System.WorkItemType': 'Task',
      },
    };
    const typeFields = [{ referenceName: 'System.Title', defaultValue: '' }];
    const witApi = makeWitApi(workItem, typeFields);
    const conn = makeConn(witApi);
    await getWorkItem(conn, 11);
    await getWorkItem(conn, 11);
    // getWorkItemTypeFieldsWithReferences should only be called once due to cache
    expect(witApi.getWorkItemTypeFieldsWithReferences).toHaveBeenCalledTimes(1);
  });
});
