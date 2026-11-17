# Running with Docker

The server ships with a `Dockerfile` that exposes the MCP protocol over **Streamable HTTP** (`POST /mcp`), making it easy to test with raw JSON-RPC from any HTTP client.

---

## Quick start (on-premises Azure DevOps Server)

```bash
docker run -d --name mcp-ado -p 8888:3000 \
  -e AZURE_DEVOPS_ORG_URL="https://your-server/tfs/YourCollection" \
  -e AZURE_DEVOPS_AUTH_METHOD=pat \
  -e AZURE_DEVOPS_PAT="<your-pat>" \
  -e AZURE_DEVOPS_API_VERSION="6.0" \
  aqajooon/mcp-server-azure-devops:latest
```

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
```

### With access token and read-only mode

```bash
docker run -d --name mcp-ado -p 8888:3000 \
  -e AZURE_DEVOPS_ORG_URL="https://your-server/tfs/YourCollection" \
  -e AZURE_DEVOPS_AUTH_METHOD=pat \
  -e AZURE_DEVOPS_PAT="<your-pat>" \
  -e AZURE_DEVOPS_API_VERSION="6.0" \
  -e MCP_AUTH_TOKEN="your-secret-token" \
  -e MCP_READ_ONLY="true" \
  aqajooon/mcp-server-azure-devops:latest
```

---

## Docker Hub

Images are published automatically on every push to `main`:

| Tag | Description |
|-----|-------------|
| `latest` | Most recent main-branch build |
| `<full-git-sha>` | Exact commit build |

```bash
docker pull aqajooon/mcp-server-azure-devops:latest
```

---

## Build locally

```bash
docker build -t mcp-server-azure-devops:local .
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `AZURE_DEVOPS_ORG_URL` | **Yes** | — | Collection URL. On-prem: `https://host/tfs/Collection`. Do **not** include the project name. |
| `AZURE_DEVOPS_AUTH_METHOD` | No | `pat` | `pat`, `azure-identity`, or `azure-cli` |
| `AZURE_DEVOPS_PAT` | Yes (if `pat`) | — | Personal Access Token |
| `AZURE_DEVOPS_API_VERSION` | No | `7.1` | REST API version. Set to `6.0` or `7.0` for older ADO Server versions. |
| `PORT` | No | `3000` | HTTP port inside the container |
| `MCP_PATH` | No | `/mcp` | URL path for the MCP endpoint |
| `MCP_AUTH_TOKEN` | No | — | When set, every `POST` to `MCP_PATH` must include `Authorization: Bearer <value>`. Requests without it receive `HTTP 401`. `/healthz` is always open. |
| `MCP_READ_ONLY` | No | `false` | Set to `true` to expose only read tools and block all write operations. |

> **Note:** `AZURE_DEVOPS_DEFAULT_PROJECT` has been **removed**. Every tool call that targets a project requires an explicit `projectId` parameter. This prevents silent fallback to a wrong project.

---

## Docker Compose

### Standalone (pulls image from Docker Hub)

```bash
cp .env.example .env   # then fill in your credentials
docker compose -f docker-compose.standalone.yml up -d
```

### Development (builds from source)

```bash
cp .env.example .env
docker compose up -d   # uses docker-compose.yml which builds locally
```

---

## Testing with curl

### Health check (no token required)

```bash
curl http://localhost:8888/healthz
```

### Initialize session

```bash
curl -s -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

### List all tools

```bash
curl -s -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

### Call a tool

```bash
curl -s -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_projects",
      "arguments": {}
    }
  }'
```

```bash
curl -s -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "list_pipelines",
      "arguments": { "projectId": "MyProject" }
    }
  }'
```

> Omit the `Authorization` header if `MCP_AUTH_TOKEN` is not set.

---

## On-premises Azure DevOps Server notes

- `AZURE_DEVOPS_ORG_URL` must be the **collection** URL only: `https://host/tfs/Collection`
- Use `AZURE_DEVOPS_AUTH_METHOD=pat` — only PAT authentication works on-prem
- Set `AZURE_DEVOPS_API_VERSION` to match your server version:
  - ADO Server 2022 → `7.0`
  - ADO Server 2020 → `6.0`
  - ADO Server 2019 → `5.1`
- Every tool that targets a project requires `projectId` in the call arguments
- `list_organizations` and `get_me` are **not available** (cloud-only APIs)

---

## Security options

### MCP access token (`MCP_AUTH_TOKEN`)

Protects the HTTP MCP endpoint with a bearer token. Every `POST` to `MCP_PATH` must include:

```
Authorization: Bearer <your-token>
```

Requests without it receive `HTTP 401 Unauthorized` with a `WWW-Authenticate: Bearer realm="mcp"` header. The `/healthz` endpoint is always open.

```bash
docker run ... -e MCP_AUTH_TOKEN="your-secret-token" aqajooon/mcp-server-azure-devops:latest
```

### Read-only mode (`MCP_READ_ONLY`)

Restricts the server to read-only operations. All write tools are removed from the tool list and blocked at call time:

| Category | Blocked tools |
|---|---|
| Repositories | `create_branch`, `create_commit` |
| Pull Requests | `create_pull_request`, `add_pull_request_comment`, `update_pull_request`, `update_pull_request_thread_status` |
| Wikis | `create_wiki`, `create_wiki_page`, `update_wiki_page` |
| Work Items | `create_work_item`, `update_work_item`, `manage_work_item_link`, `create_work_item_attachment`, `delete_work_item_attachment` |
| Pipelines | `trigger_pipeline` |

```bash
docker run ... -e MCP_READ_ONLY="true" aqajooon/mcp-server-azure-devops:latest
```

---

## GitHub Actions secrets required for Docker Hub push

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
