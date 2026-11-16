#!/usr/bin/env node
/**
 * HTTP / Streamable-HTTP entry point for the Azure DevOps MCP Server.
 *
 * Run this instead of src/index.ts (stdio) when you want to expose the server
 * over HTTP – for example inside a Docker container or when testing via raw
 * JSON-RPC over HTTP.
 *
 * Transport: MCP Streamable HTTP (spec 2025-03-26 / SDK ≥ 1.7)
 *   POST <MCP_PATH>   – JSON-RPC request body → JSON-RPC response
 *   GET  /healthz     – liveness probe
 *
 * Environment variables:
 *   PORT                        HTTP port (default: 3000)
 *   MCP_PATH                    URL path for the MCP endpoint (default: /mcp)
 *   AZURE_DEVOPS_ORG_URL        (required) e.g. https://dev.azure.com/my-org
 *   AZURE_DEVOPS_AUTH_METHOD    pat | azure-identity | azure-cli  (default: pat)
 *   AZURE_DEVOPS_PAT            Personal access token (required when auth=pat)
 *   AZURE_DEVOPS_DEFAULT_PROJECT
 *   AZURE_DEVOPS_API_VERSION
 */

import { createAzureDevOpsServer } from './server';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import http from 'http';
import dotenv from 'dotenv';
import { AzureDevOpsConfig } from './shared/types';
import { AuthenticationMethod } from './shared/auth/auth-factory';

dotenv.config({ quiet: true });

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizeAuthMethod(s?: string): AuthenticationMethod {
  const lower = (s ?? '').toLowerCase();
  if (lower === AuthenticationMethod.PersonalAccessToken.toLowerCase())
    return AuthenticationMethod.PersonalAccessToken;
  if (lower === AuthenticationMethod.AzureIdentity.toLowerCase())
    return AuthenticationMethod.AzureIdentity;
  if (lower === AuthenticationMethod.AzureCli.toLowerCase())
    return AuthenticationMethod.AzureCli;
  if (s) {
    process.stderr.write(
      `WARNING: Unknown auth method '${s}'. Falling back to ${AuthenticationMethod.AzureIdentity}.\n`,
    );
  }
  return AuthenticationMethod.AzureIdentity;
}

function getConfig(): AzureDevOpsConfig {
  return {
    organizationUrl: process.env.AZURE_DEVOPS_ORG_URL ?? '',
    authMethod: normalizeAuthMethod(process.env.AZURE_DEVOPS_AUTH_METHOD),
    personalAccessToken: process.env.AZURE_DEVOPS_PAT,
    defaultProject: process.env.AZURE_DEVOPS_DEFAULT_PROJECT,
    apiVersion: process.env.AZURE_DEVOPS_API_VERSION,
  };
}

/** Collect all chunks from an IncomingMessage and return as a string. */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

// ─── server ─────────────────────────────────────────────────────────────────

async function main() {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const mcpPath = process.env.MCP_PATH ?? '/mcp';

  const mcpServer = createAzureDevOpsServer(getConfig());

  const httpServer = http.createServer(async (req, res) => {
    try {
      // ── health check ──────────────────────────────────────────────────────
      if (req.method === 'GET' && req.url === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      // ── MCP endpoint ──────────────────────────────────────────────────────
      if (req.url !== mcpPath) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
      }

      // Parse body
      const rawBody = await readBody(req);
      let body: unknown;
      try {
        body = JSON.parse(rawBody);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      // Create a fresh transport per request (stateless mode – safe behind a
      // load balancer; also prevents request-ID collisions between clients).
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
        enableJsonResponse: true,      // respond with JSON rather than SSE
      });

      // Clean up when the client disconnects
      res.on('close', () => transport.close());

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (err) {
      process.stderr.write(`HTTP handler error: ${err}\n`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
      }
      if (!res.writableEnded) {
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  });

  httpServer.listen(port, () => {
    process.stderr.write(
      `Azure DevOps MCP Server (HTTP) running on port ${port}\n`,
    );
    process.stderr.write(
      `  Health:      GET  http://localhost:${port}/healthz\n`,
    );
    process.stderr.write(
      `  MCP (JSON-RPC): POST http://localhost:${port}${mcpPath}\n`,
    );
  });

  const shutdown = (sig: string) => {
    process.stderr.write(`${sig} received – shutting down\n`);
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
