import { WebApi } from 'azure-devops-node-api';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { getWorkItemAttachment } from './feature';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

function makePipeableStream(content: string) {
  const readable = new Readable({ read() {} });
  const writableTarget = { 
    on: jest.fn((event: string, cb: () => void) => { if (event === 'finish') cb(); return writableTarget; }),
    end: jest.fn(),
  };
  // Simulate that the attachment stream has a 'pipe' method and fires 'error'/'end'
  const stream = {
    pipe: jest.fn().mockReturnValue(writableTarget),
    on: jest.fn((event: string, cb: () => void) => stream),
  };
  return stream;
}

function makeConn(stream: unknown) {
  const witApi = { getAttachmentContent: jest.fn().mockResolvedValue(stream) };
  return {
    getWorkItemTrackingApi: jest.fn().mockResolvedValue(witApi),
  } as unknown as WebApi;
}

describe('getWorkItemAttachment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when attachmentId is missing', async () => {
    const conn = makeConn(null);
    await expect(
      getWorkItemAttachment(conn, { attachmentId: '', outputPath: '/tmp/out.txt' }),
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
      getWorkItemAttachment(conn, { attachmentId: 'abc', outputPath: '/tmp/out.txt' }),
    ).rejects.toThrow('No content received');
  });
});
