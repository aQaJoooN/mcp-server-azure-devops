import { WebApi } from 'azure-devops-node-api';
import { getWorkItemAttachment } from './feature';

function makeConn(_stream: unknown) {
  const witApi = { getAttachmentContent: jest.fn().mockResolvedValue(_stream) };
  return {
    getWorkItemTrackingApi: jest.fn().mockResolvedValue(witApi),
  } as unknown as WebApi;
}

describe('getWorkItemAttachment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when attachmentId is missing', async () => {
    const conn = makeConn(null);
    await expect(
      getWorkItemAttachment(conn, {
        attachmentId: '',
        outputPath: '/tmp/out.txt',
      }),
    ).rejects.toThrow('Attachment ID is required');
  });

  it('throws when outputPath is missing', async () => {
    const conn = makeConn(null);
    await expect(
      getWorkItemAttachment(conn, { attachmentId: 'abc', outputPath: '' }),
    ).rejects.toThrow('Output path is required');
  });

  it('throws when no stream returned', async () => {
    const conn = makeConn(null);
    await expect(
      getWorkItemAttachment(conn, {
        attachmentId: 'abc',
        outputPath: '/tmp/out.txt',
      }),
    ).rejects.toThrow('No content received');
  });
});
