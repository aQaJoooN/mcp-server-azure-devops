import { WebApi } from 'azure-devops-node-api';
import * as fs from 'fs';
import { createWorkItemAttachment } from './feature';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

function makeWitApi(attachmentResult: unknown, updatedWorkItem: unknown) {
  return {
    createAttachment: jest.fn().mockResolvedValue(attachmentResult),
    updateWorkItem: jest.fn().mockResolvedValue(updatedWorkItem),
  };
}

function makeConn(witApi: unknown) {
  return {
    getWorkItemTrackingApi: jest.fn().mockResolvedValue(witApi),
  } as unknown as WebApi;
}

describe('createWorkItemAttachment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when filePath is missing', async () => {
    const conn = makeConn(makeWitApi(null, null));
    await expect(
      createWorkItemAttachment(conn, 1, { filePath: '', fileName: 'test.txt' }),
    ).rejects.toThrow('File path is required');
  });

  it('throws when file does not exist', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const conn = makeConn(makeWitApi(null, null));
    await expect(
      createWorkItemAttachment(conn, 1, { filePath: '/tmp/missing.txt' }),
    ).rejects.toThrow('File does not exist');
  });

  it('throws when attachment upload returns no URL', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(Buffer.from('content') as never);
    const conn = makeConn(makeWitApi({ url: null }, null));
    await expect(
      createWorkItemAttachment(conn, 1, { filePath: '/tmp/file.txt' }),
    ).rejects.toThrow('Failed to upload attachment');
  });

  it('creates attachment and returns updated work item', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(Buffer.from('file content') as never);
    const attachmentResult = { url: 'https://ado/attachments/abc-123' };
    const updatedWorkItem = { id: 5, relations: [{ rel: 'AttachedFile', url: 'https://ado/attachments/abc-123' }] };
    const witApi = makeWitApi(attachmentResult, updatedWorkItem);
    const conn = makeConn(witApi);

    const result = await createWorkItemAttachment(conn, 5, {
      filePath: '/tmp/file.txt',
      fileName: 'my-file.txt',
      comment: 'Adding evidence',
    });
    expect(result).toEqual(updatedWorkItem);
    expect(witApi.createAttachment).toHaveBeenCalled();
    expect(witApi.updateWorkItem).toHaveBeenCalledWith(
      {},
      expect.arrayContaining([
        expect.objectContaining({ op: 'add', path: '/relations/-' }),
      ]),
      5,
      undefined,
      false,
      false,
      false,
      expect.any(Number),
    );
  });

  it('throws when updateWorkItem returns null', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(Buffer.from('x') as never);
    const witApi = makeWitApi({ url: 'https://ado/attachments/xyz' }, null);
    const conn = makeConn(witApi);
    await expect(
      createWorkItemAttachment(conn, 1, { filePath: '/tmp/f.txt' }),
    ).rejects.toThrow('Failed to update work item');
  });
});
