/**
 * Unit tests for server.ts
 *
 * Covers:
 *  - read-only mode: write tools are excluded from tools/list
 *  - read-only mode: calling a write tool returns a validation error
 *  - read-only mode: read tools are still callable
 *  - auth token (HTTP): requests without a token are rejected with 401
 *  - auth token (HTTP): requests with the correct token are accepted
 *  - auth token (HTTP): requests with a wrong token are rejected with 401
 *  - auth token (HTTP): /healthz is reachable without a token
 */

import { createAzureDevOpsServer } from './server';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AuthenticationMethod } from './shared/auth/auth-factory';
import { AzureDevOpsConfig } from './shared/types';
import http from 'http';

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Build a minimal AzureDevOpsConfig that never actually connects to ADO.
 * We override getConnection in the tests that exercise tool calls so a real
 * network is never needed.
 */
function makeConfig(
  overrides: Partial<AzureDevOpsConfig> = {},
): AzureDevOpsConfig {
  return {
    organizationUrl: 'https://dev.azure.com/test-org',
    authMethod: AuthenticationMethod.PersonalAccessToken,
    personalAccessToken: 'test-pat',
    ...overrides,
  };
}

/**
 * Connect an MCP client to a fresh server instance via in-memory transport
 * and return the client.
 */
async function connectClient(
  config: AzureDevOpsConfig,
): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const server = createAzureDevOpsServer(config);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const client = new Client(
    { name: 'unit-test-client', version: '1.0.0' },
    { capabilities: {} },
  );

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    cleanup: async () => {
      await client.close();
    },
  };
}

// ─── write tool names (must match WRITE_TOOLS in server.ts) ──────────────────

const WRITE_TOOL_NAMES = [
  'create_branch',
  'create_commit',
  'create_pull_request',
  'add_pull_request_comment',
  'update_pull_request',
  'update_pull_request_thread_status',
  'create_wiki',
  'create_wiki_page',
  'update_wiki_page',
  'create_work_item',
  'update_work_item',
  'manage_work_item_link',
  'create_work_item_attachment',
  'delete_work_item_attachment',
  'trigger_pipeline',
];

// ─── read-only mode ──────────────────────────────────────────────────────────

describe('read-only mode', () => {
  describe('tools/list', () => {
    it('excludes all write tools when readOnly is true', async () => {
      const { client, cleanup } = await connectClient(
        makeConfig({ readOnly: true }),
      );
      try {
        const { tools } = await client.listTools();
        const names = tools.map((t) => t.name);

        for (const write of WRITE_TOOL_NAMES) {
          expect(names).not.toContain(write);
        }
      } finally {
        await cleanup();
      }
    });

    it('includes all write tools when readOnly is false', async () => {
      const { client, cleanup } = await connectClient(
        makeConfig({ readOnly: false }),
      );
      try {
        const { tools } = await client.listTools();
        const names = tools.map((t) => t.name);

        for (const write of WRITE_TOOL_NAMES) {
          expect(names).toContain(write);
        }
      } finally {
        await cleanup();
      }
    });

    it('includes all write tools when readOnly is not set', async () => {
      const { client, cleanup } = await connectClient(makeConfig());
      try {
        const { tools } = await client.listTools();
        const names = tools.map((t) => t.name);

        for (const write of WRITE_TOOL_NAMES) {
          expect(names).toContain(write);
        }
      } finally {
        await cleanup();
      }
    });

    it('still includes read tools when readOnly is true', async () => {
      const READ_TOOLS = [
        'list_projects',
        'get_project',
        'list_repositories',
        'get_repository',
        'list_pipelines',
        'get_pipeline',
        'list_work_items',
        'get_work_item',
        'list_pull_requests',
        'get_pull_request',
        'search_code',
      ];

      const { client, cleanup } = await connectClient(
        makeConfig({ readOnly: true }),
      );
      try {
        const { tools } = await client.listTools();
        const names = tools.map((t) => t.name);

        for (const read of READ_TOOLS) {
          expect(names).toContain(read);
        }
      } finally {
        await cleanup();
      }
    });
  });

  describe('tools/call', () => {
    it('returns a validation error when a write tool is called in read-only mode', async () => {
      const { client, cleanup } = await connectClient(
        makeConfig({ readOnly: true }),
      );
      try {
        // create_work_item requires a real ADO connection – but the read-only
        // guard fires before getConnection() is ever called, so no network
        // request is made.
        const result = await client.callTool({
          name: 'create_work_item',
          arguments: { projectId: 'test', type: 'Task', title: 'x' },
        });

        // MCP surfaces tool errors as isError:true with a text content block
        expect(result.isError).toBe(true);
        const text =
          (result.content as Array<{ type: string; text: string }>).find(
            (b) => b.type === 'text',
          )?.text ?? '';
        expect(text).toMatch(/read-only/i);
        expect(text).toMatch(/create_work_item/);
      } finally {
        await cleanup();
      }
    });

    it.each(WRITE_TOOL_NAMES)(
      'blocks write tool "%s" in read-only mode',
      async (toolName) => {
        const { client, cleanup } = await connectClient(
          makeConfig({ readOnly: true }),
        );
        try {
          const result = await client.callTool({
            name: toolName,
            arguments: {},
          });
          expect(result.isError).toBe(true);
          const text =
            (result.content as Array<{ type: string; text: string }>).find(
              (b) => b.type === 'text',
            )?.text ?? '';
          expect(text).toMatch(/read-only/i);
        } finally {
          await cleanup();
        }
      },
    );
  });
});

// ─── MCP auth token (HTTP transport) ─────────────────────────────────────────

/**
 * Spin up http-server.ts behaviour inline so we can test the auth middleware
 * without spawning a child process.  We reproduce just the relevant logic from
 * http-server.ts rather than importing it (it calls main() on import).
 */
function makeHttpHandler(mcpAuthToken: string | null) {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    // health check – always open
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // bearer token check
    if (mcpAuthToken) {
      const authHeader = req.headers['authorization'] ?? '';
      const supplied = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';
      if (supplied !== mcpAuthToken) {
        res.writeHead(401, {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="mcp"',
        });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    // If we get here the token was valid (or not required) – echo 200
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  };
}

function startTestServer(
  handler: (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) => Promise<void>,
): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer(handler);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Could not get server address'));
        return;
      }
      resolve({
        port: addr.port,
        close: () => new Promise<void>((res) => srv.close(() => res())),
      });
    });
  });
}

function httpRequest(opts: {
  port: number;
  path?: string;
  method?: string;
  headers?: Record<string, string>;
}): Promise<{
  statusCode: number;
  body: string;
  headers: http.IncomingHttpHeaders;
}> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: opts.port,
        path: opts.path ?? '/mcp',
        method: opts.method ?? 'POST',
        headers: opts.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf-8'),
            headers: res.headers,
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('HTTP auth token', () => {
  describe('when MCP_AUTH_TOKEN is set', () => {
    const TOKEN = 'super-secret-test-token';
    let port: number;
    let closeServer: () => Promise<void>;

    beforeAll(async () => {
      const srv = await startTestServer(makeHttpHandler(TOKEN));
      port = srv.port;
      closeServer = srv.close;
    });

    afterAll(() => closeServer());

    it('returns 401 when Authorization header is missing', async () => {
      const res = await httpRequest({ port });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toEqual({ error: 'Unauthorized' });
    });

    it('returns 401 when Authorization header has wrong token', async () => {
      const res = await httpRequest({
        port,
        headers: { Authorization: 'Bearer wrong-token' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 when Authorization header is not a Bearer scheme', async () => {
      const res = await httpRequest({
        port,
        headers: { Authorization: `Basic ${TOKEN}` },
      });
      expect(res.statusCode).toBe(401);
    });

    it('passes through when the correct token is supplied', async () => {
      const res = await httpRequest({
        port,
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('includes WWW-Authenticate header on 401', async () => {
      const res = await httpRequest({ port });
      expect(res.headers['www-authenticate']).toBe('Bearer realm="mcp"');
    });

    it('allows /healthz without a token', async () => {
      const res = await httpRequest({ port, path: '/healthz', method: 'GET' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ status: 'ok' });
    });
  });

  describe('when MCP_AUTH_TOKEN is not set', () => {
    let port: number;
    let closeServer: () => Promise<void>;

    beforeAll(async () => {
      const srv = await startTestServer(makeHttpHandler(null));
      port = srv.port;
      closeServer = srv.close;
    });

    afterAll(() => closeServer());

    it('passes through requests without an Authorization header', async () => {
      const res = await httpRequest({ port });
      expect(res.statusCode).toBe(200);
    });

    it('passes through requests with any Authorization header', async () => {
      const res = await httpRequest({
        port,
        headers: { Authorization: 'Bearer anything' },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
