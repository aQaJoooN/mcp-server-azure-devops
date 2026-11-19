import { WebApi } from 'azure-devops-node-api';
import { deleteWorkItemAttachment } from './feature';

function makeWitApi(workItem: unknown, updatedWorkItem: unknown = { id: 1 }) {
  return {
    getWorkItem: jest.fn().mockResolvedValue(workItem),
    updateWorkItem: jest.fn().mockResolvedValue(updatedWorkItem),
  };
}

function makeConn(witApi: unknown) {
  return {
    getWorkItemTrackingApi: jest.fn().mockResolvedValue(witApi),
  } as unknown as WebApi;
}

describe('deleteWorkItemAttachment', () => {
  it('throws when workItemId is missing', async () => {
    const conn = makeConn(makeWitApi(null));
    await expect(
      deleteWorkItemAttachment(conn, { workItemId: 0, attachmentId: 'abc' }),
    ).rejects.toThrow('Work item ID is required');
  });

  it('throws when attachmentId is missing', async () => {
    const conn = makeConn(makeWitApi(null));
    await expect(
      deleteWorkItemAttachment(conn, { workItemId: 1, attachmentId: '' }),
    ).rejects.toThrow('Attachment ID is required');
  });

  it('throws when work item not found', async () => {
    const conn = makeConn(makeWitApi(null));
    await expect(
      deleteWorkItemAttachment(conn, { workItemId: 99, attachmentId: 'abc' }),
    ).rejects.toThrow('not found');
  });

  it('throws when attachment not found on work item', async () => {
    const workItem = {
      id: 1,
      relations: [
        { rel: 'AttachedFile', url: 'https://ado/attachments/other-id' },
      ],
    };
    const conn = makeConn(makeWitApi(workItem));
    await expect(
      deleteWorkItemAttachment(conn, {
        workItemId: 1,
        attachmentId: 'missing-attachment-id',
      }),
    ).rejects.toThrow('not found');
  });

  it('removes attachment and returns updated work item', async () => {
    const attachmentId = 'attach-123';
    const workItem = {
      id: 1,
      relations: [
        { rel: 'AttachedFile', url: `https://ado/attachments/${attachmentId}` },
        { rel: 'Parent', url: 'https://ado/workitems/5' },
      ],
    };
    const updatedWorkItem = {
      id: 1,
      relations: [{ rel: 'Parent', url: 'https://ado/workitems/5' }],
    };
    const witApi = makeWitApi(workItem, updatedWorkItem);
    const conn = makeConn(witApi);

    const result = await deleteWorkItemAttachment(conn, {
      workItemId: 1,
      attachmentId,
    });
    expect(result).toEqual(updatedWorkItem);
    expect(witApi.updateWorkItem).toHaveBeenCalledWith(
      {},
      [{ op: 'remove', path: '/relations/0' }],
      1,
      undefined,
      false,
      false,
      false,
      expect.any(Number),
    );
  });

  it('throws when updateWorkItem returns null', async () => {
    const attachmentId = 'attach-456';
    const workItem = {
      id: 1,
      relations: [
        { rel: 'AttachedFile', url: `https://ado/attachments/${attachmentId}` },
      ],
    };
    const witApi = makeWitApi(workItem, null);
    const conn = makeConn(witApi);
    await expect(
      deleteWorkItemAttachment(conn, { workItemId: 1, attachmentId }),
    ).rejects.toThrow('Failed to update work item');
  });
});
