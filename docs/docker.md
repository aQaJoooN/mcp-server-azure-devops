# Running with Docker

The server ships with a `Dockerfile` that exposes the MCP protocol over **Streamable-HTTP** (`POST /mcp`), so you can test it with raw JSON-RPC from any HTTP client.

---

## Quick start

```bash
docker run -d --name mcp-ado -p 8888:3000 \
  -e AZURE_DEVOPS_ORG_URL="https://dev.azure.com/my-org" \
  -e AZURE_DEVOPS_AUTH_METHOD=pat \
  -e AZURE_DEVOPS_PAT="<your-pat>" \
  -e AZURE_DEVOPS_DEFAULT_PROJECT="MyProject" \
  aqajooon/mcp-server-azure-devops:latest
```

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
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
| `AZURE_DEVOPS_ORG_URL` | Yes | — | Organization or collection URL. On-prem: `https://host/tfs/Collection` — do **not** include the project |
| `AZURE_DEVOPS_AUTH_METHOD` | No | `pat` | `pat`, `azure-identity`, or `azure-cli` |
| `AZURE_DEVOPS_PAT` | Yes (if `pat`) | — | Personal Access Token |
| `AZURE_DEVOPS_DEFAULT_PROJECT` | No | — | Default project when tool calls omit `projectId` |
| `AZURE_DEVOPS_API_VERSION` | No | `7.1` | REST API version (e.g. `7.0` for ADO Server 2022) |
| `PORT` | No | `3000` | HTTP port inside the container |
| `MCP_PATH` | No | `/mcp` | URL path for the MCP endpoint |

---

## Docker Compose

### Standalone (pulls image from Docker Hub)

```bash
cp .env.example .env   # then fill in credentials
docker compose -f docker-compose.standalone.yml up -d
```

### Development (builds from source)

```bash
cp .env.example .env
docker compose up -d   # uses docker-compose.yml which builds locally
```

---

## Testing with curl

### Initialize

```bash
curl -s -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

### List tools

```bash
curl -s -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

### Call a tool

```bash
curl -s -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_pipelines",
      "arguments": { "projectId": "MyProject" }
    }
  }'
```

---

## On-prem (Azure DevOps Server) notes

- `AZURE_DEVOPS_ORG_URL` = collection URL only: `https://host/tfs/Collection`
- Project name goes in `AZURE_DEVOPS_DEFAULT_PROJECT`
- Use `AZURE_DEVOPS_AUTH_METHOD=pat`
- Set `AZURE_DEVOPS_API_VERSION` to match your server version

---

## GitHub Actions secrets required

To push images from CI, add these secrets to your repository:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (Settings → Security → New Access Token) |
