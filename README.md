# Azure DevOps MCP Server

A Model Context Protocol (MCP) server implementation for Azure DevOps, allowing AI assistants to interact with Azure DevOps APIs through a standardized protocol.

> **On-premises only.** This server targets **Azure DevOps Server (on-premises)** exclusively. Tools that call Azure DevOps Services-only APIs (`list_organizations`, `get_me`) have been removed. If you use Azure DevOps Services (cloud), consider [microsoft/azure-devops-mcp](https://github.com/microsoft/azure-devops-mcp).

## Overview

This server implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for Azure DevOps, enabling AI assistants like Claude to interact with Azure DevOps resources securely. The server acts as a bridge between AI models and Azure DevOps APIs, providing a standardized way to:

- Access and manage projects, work items, repositories, and more
- Create and update work items, branches, and pull requests
- Execute common DevOps workflows through natural language
- Access repository content via standardized resource URIs
- Safely authenticate and interact with Azure DevOps resources

## Server Structure

The server is structured around the Model Context Protocol (MCP) for communicating with AI assistants. It provides tools for interacting with Azure DevOps resources including:

- Projects
- Work Items
- Repositories
- Pull Requests
- Branches
- Pipelines

### Core Components

- **AzureDevOpsServer**: Main server class that initializes the MCP server and registers tools
- **Feature Modules**: Organized by feature area (work-items, projects, repositories, etc.)
- **Request Handlers**: Each feature module provides request identification and handling functions
- **Tool Handlers**: Modular functions for each Azure DevOps operation
- **Configuration**: Environment-based configuration for organization URL, PAT, etc.

The server uses a feature-based architecture where each feature area (like work-items, projects, repositories) is encapsulated in its own module. This makes the codebase more maintainable and easier to extend with new features.

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Azure DevOps account with appropriate access
- Authentication credentials (see [Authentication Guide](https://github.com/aQaJoooN/mcp-server-azure-devops/blob/main/docs/authentication.md) for details):
  - Personal Access Token (PAT), or
  - Azure Identity credentials, or
  - Azure CLI login

### Running from npm (npx)

If you just want to run the **published** server package, you **do not** need to clone or build this repository:

```bash
npx -y @aqajooon/mcp-server-azure-devops
```

### Running locally (from source)

From a checkout of this repository:

```bash
npm ci
cp .env.example .env   # then edit values
npm run build
npm start              # runs: node dist/index.js  (stdio transport)
```

For the HTTP transport (Docker-compatible):

```bash
npm run build
npm run start:http     # runs: node dist/http-server.js  (Streamable-HTTP on PORT, default 3000)
```

For iterative development (auto-reload):

```bash
npm run dev            # runs src/index.ts via tsx watch
```

### Running with Docker

```bash
# Build the image
docker build -t mcp-server-azure-devops:local .

# Run — PAT auth, on-prem, with read-only mode and auth token
docker run -p 8888:3000 \
  -e AZURE_DEVOPS_ORG_URL="https://your-server/tfs/YourCollection" \
  -e AZURE_DEVOPS_AUTH_METHOD=pat \
  -e AZURE_DEVOPS_PAT="<token>" \
  -e AZURE_DEVOPS_API_VERSION="6.0" \
  -e MCP_AUTH_TOKEN="your-secret-token" \
  -e MCP_READ_ONLY="true" \
  mcp-server-azure-devops:local

# Health check (always open, no token required)
curl http://localhost:8888/healthz

# JSON-RPC test call (token required when MCP_AUTH_TOKEN is set)
curl -s -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

> **On-prem URL format**: `AZURE_DEVOPS_ORG_URL` must be the **collection** URL only —
> `https://host/tfs/Collection`. Do **not** include the project in the org URL.
> Every tool that targets a project requires `projectId` explicitly in the call arguments.

### Usage with Claude Desktop/Cursor AI

To integrate with Claude Desktop or Cursor AI, add one of the following configurations to your configuration file.

#### Azure Identity Authentication

Be sure you are logged in to Azure CLI with `az login` then add the following:

```json
{
  "mcpServers": {
    "azureDevOps": {
      "command": "npx",
      "args": ["-y", "@aqajooon/mcp-server-azure-devops"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "https://your-server/tfs/YourCollection",
        "AZURE_DEVOPS_AUTH_METHOD": "azure-identity"
      }
    }
  }
}
```

#### Personal Access Token (PAT) Authentication

```json
{
  "mcpServers": {
    "azureDevOps": {
      "command": "npx",
      "args": ["-y", "@aqajooon/mcp-server-azure-devops"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "https://your-server/tfs/YourCollection",
        "AZURE_DEVOPS_AUTH_METHOD": "pat",
        "AZURE_DEVOPS_PAT": "<YOUR_PAT>"
      }
    }
  }
}
```

Azure DevOps Server (on-prem) example:

```json
{
  "mcpServers": {
    "azureDevOps": {
      "command": "npx",
      "args": ["-y", "@aqajooon/mcp-server-azure-devops"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "https://server:8080/tfs/DefaultCollection",
        "AZURE_DEVOPS_AUTH_METHOD": "pat",
        "AZURE_DEVOPS_PAT": "<YOUR_PAT>",
        "AZURE_DEVOPS_API_VERSION": "6.0"
      }
    }
  }
}
```

For detailed configuration instructions and more authentication options, see the [Authentication Guide](https://github.com/aQaJoooN/mcp-server-azure-devops/blob/main/docs/authentication.md).

## Authentication Methods

This server supports multiple authentication methods for connecting to Azure DevOps APIs. For detailed setup instructions, configuration examples, and troubleshooting tips, see the [Authentication Guide](https://github.com/aQaJoooN/mcp-server-azure-devops/blob/main/docs/authentication.md).

### Supported Authentication Methods

1. **Personal Access Token (PAT)** - Simple token-based authentication
2. **Azure Identity (DefaultAzureCredential)** - Flexible authentication using the Azure Identity SDK
3. **Azure CLI** - Authentication using your Azure CLI login

Example configuration files for each authentication method are available in the [examples directory](https://github.com/aQaJoooN/mcp-server-azure-devops/tree/main/docs/examples).

Azure DevOps Server (on-prem) supports PAT authentication only. Azure Identity and Azure CLI are supported for Azure DevOps Services.

## Environment Variables

For a complete list of environment variables and their descriptions, see the [Authentication Guide](https://github.com/aQaJoooN/mcp-server-azure-devops/blob/main/docs/authentication.md#configuration-reference).

Key environment variables include:

| Variable                       | Description                                                                        | Required                     | Default          |
| ------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------- | ---------------- |
| `AZURE_DEVOPS_AUTH_METHOD`     | Authentication method (`pat`, `azure-identity`, or `azure-cli`) - case-insensitive | No                           | `azure-identity` |
| `AZURE_DEVOPS_ORG_URL`         | Collection URL e.g. `https://host/tfs/Collection` — do **not** include the project | Yes                          | —                |
| `AZURE_DEVOPS_PAT`             | Personal Access Token (required when auth=pat)                                     | Only with PAT auth           | —                |
| `AZURE_DEVOPS_API_VERSION`     | REST api-version override (e.g. `6.0` for ADO Server 2019/2020, `7.0` for 2022)   | No                           | `7.1`            |
| `MCP_AUTH_TOKEN`               | Bearer token clients must supply in `Authorization: Bearer <token>`. When set, unauthenticated requests to the MCP endpoint receive HTTP 401. `/healthz` is always open. | No | — |
| `MCP_READ_ONLY`                | Set to `true` to expose only read tools and block all write operations.            | No                           | `false`          |
| `AZURE_TENANT_ID`              | Azure AD tenant ID (service principal auth)                                        | Only with service principals | —                |
| `AZURE_CLIENT_ID`              | Azure AD application ID (service principal auth)                                   | Only with service principals | —                |
| `AZURE_CLIENT_SECRET`          | Azure AD client secret (service principal auth)                                    | Only with service principals | —                |
| `LOG_LEVEL`                    | Logging level (`debug`, `info`, `warn`, `error`)                                   | No                           | `info`           |

> **`AZURE_DEVOPS_DEFAULT_PROJECT` has been removed.** Every tool that targets a project requires an explicit `projectId` parameter. This prevents silent fallback to a wrong project.

## Troubleshooting Authentication

For detailed troubleshooting information for each authentication method, see the [Authentication Guide](https://github.com/aQaJoooN/mcp-server-azure-devops/blob/main/docs/authentication.md#troubleshooting-authentication-issues).

Common issues include:

- Invalid or expired credentials
- Insufficient permissions
- Network connectivity problems
- Configuration errors

## Authentication Implementation Details

For technical details about how authentication is implemented in the Azure DevOps MCP server, see the [Authentication Guide](https://github.com/aQaJoooN/mcp-server-azure-devops/blob/main/docs/authentication.md) and the source code in the `src/auth` directory.

## Available Tools

For full documentation see [docs/tools/README.md](./docs/tools/README.md).

> **Removed (cloud-only):** `list_organizations` and `get_me` called Azure DevOps Services APIs that do not exist on on-premises servers. Both have been removed. Use `list_projects` to discover what's available on your server.

### Project Tools
- `list_projects` — list all projects in the collection
- `get_project` — get a specific project by name or ID
- `get_project_details` — extended info (teams, process, work item types)

### Repository Tools
- `list_repositories` — list all repos in a project
- `get_repository` — get a specific repository
- `get_repository_details` — repo statistics, refs, branch info
- `get_file_content` — get a file or directory listing from any branch/tag/commit
- `get_repository_tree` — full directory tree from any path and depth
- `get_all_repositories_tree` — tree across all repos in a project
- `list_branches` — list branches with optional prefix filter
- `list_tags` — list tags with optional prefix filter
- `list_commits` — list commits on a branch
- `create_branch` — create a branch from an existing one
- `create_commit` — commit file changes via unified diff or search/replace

### Pull Request Tools
- `create_pull_request` — create a new PR
- `get_pull_request` — get a PR by ID
- `list_pull_requests` — list PRs with filters (status, reviewer, branch, etc.)
- `add_pull_request_comment` — add a comment or file-level inline comment
- `get_pull_request_comments` — get all comment threads
- `update_pull_request` — update title, description, status, reviewers, work items
- `update_pull_request_thread_status` — resolve, close, or reopen a thread
- `get_pull_request_changes` — list changed files and diffs
- `get_pull_request_checks` — policy evaluations and status checks

### Work Item Tools
- `get_work_item` — get a work item by ID
- `create_work_item` — create a new work item
- `update_work_item` — update fields, state, tags, assignee
- `list_work_items` — query via WIQL or saved query ID
- `get_work_item_comments` — get comments on a work item
- `manage_work_item_link` — add, update, or remove work item links
- `create_work_item_attachment` — upload and attach a file
- `get_work_item_attachment` — download an attachment
- `delete_work_item_attachment` — delete an attachment

### Pipeline Tools
- `list_pipelines` — list pipelines in a project
- `get_pipeline` — get pipeline definition details
- `list_pipeline_runs` — list runs with filters (branch, state, result, date range)
- `get_pipeline_run` — get detailed run info and artifact summaries
- `trigger_pipeline` — trigger a run with custom variables and parameters
- `pipeline_timeline` — stage/job/task timeline for a run
- `get_pipeline_log` — get log content by logId (plain or JSON)
- `download_pipeline_artifact` — download a file from pipeline artifacts
- `get_pipeline_run_yaml` — resolve the full YAML including all templates
- `get_pipeline_run_sources` — source repos, branches, and commit versions used in a run
- `get_pipeline_run_stage_tasks` — task hierarchy with logIds per stage/job

### Infrastructure Tools
- `list_environments` — list deployment environments (approval gates, Kubernetes, VMs)
- `list_libraries` — list variable groups
- `list_service_connections` — list service endpoints used by pipelines

### Wiki Tools
- `get_wikis` — list wikis in a project
- `create_wiki` — create a project or code wiki
- `get_wiki_page` — get a page's markdown content
- `create_wiki_page` — create a new wiki page
- `update_wiki_page` — update a wiki page
- `list_wiki_pages` — list all pages in a wiki

### Search Tools
- `search_code` — full-text code search across repositories
- `search_wiki` — search wiki pages
- `search_work_items` — search work items

## MCP Server Security

### Access token (`MCP_AUTH_TOKEN`) — HTTP transport only

When running the HTTP transport (`npm run start:http` / Docker), you can require every client to present a bearer token:

```bash
MCP_AUTH_TOKEN=your-secret-token npm run start:http
```

Clients must include the header on every request:

```
Authorization: Bearer your-secret-token
```

Requests without a valid token receive `HTTP 401 Unauthorized`. The `/healthz` endpoint is intentionally exempt so load-balancer probes keep working without credentials.

The stdio transport (local AI-assistant use) is not affected — it is already protected by OS process isolation.

### Read-only mode (`MCP_READ_ONLY`)

Set `MCP_READ_ONLY=true` to expose only tools that read data from Azure DevOps. All 15 write tools are removed from the tool list and blocked at call time:

| Category | Blocked tools |
|---|---|
| Repositories | `create_branch`, `create_commit` |
| Pull Requests | `create_pull_request`, `add_pull_request_comment`, `update_pull_request`, `update_pull_request_thread_status` |
| Wikis | `create_wiki`, `create_wiki_page`, `update_wiki_page` |
| Work Items | `create_work_item`, `update_work_item`, `manage_work_item_link`, `create_work_item_attachment`, `delete_work_item_attachment` |
| Pipelines | `trigger_pipeline` |

Any attempt to call a blocked tool returns a clear error: `Tool '<name>' is not available: the server is running in read-only mode.`

Both options can be combined:

```bash
MCP_AUTH_TOKEN=my-token MCP_READ_ONLY=true npm run start:http
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](https://github.com/aQaJoooN/mcp-server-azure-devops/blob/main/CONTRIBUTING.md) for contribution guidelines.

## Star History

[![Star History Chart](https://star-history.dera.page/svg?repos=aQaJoooN/mcp-server-azure-devops&type=Date)](https://star-history.dera.page/#aQaJoooN/mcp-server-azure-devops&Date)

## License

MIT
