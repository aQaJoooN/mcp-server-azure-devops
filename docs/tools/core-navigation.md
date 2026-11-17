# Core Navigation Tools for Azure DevOps

This document provides an overview of the core navigation tools for exploring the Azure DevOps resource hierarchy.

## Navigation Hierarchy

```
Collection (AZURE_DEVOPS_ORG_URL)
└── Projects
    ├── Repositories
    │   ├── Branches, Tags, Files
    │   └── Pull Requests
    ├── Work Items
    ├── Pipelines
    │   └── Pipeline Runs
    ├── Wikis
    ├── Environments
    ├── Libraries (Variable Groups)
    └── Service Connections
```

## Available Tools

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| [`list_projects`](./projects.md#list_projects) | Lists all projects in the collection | None | stateFilter, top, skip, continuationToken |
| [`get_project`](./projects.md#get_project) | Gets details of a specific project | projectId | — |
| [`list_repositories`](./repositories.md#list_repositories) | Lists all repositories in a project | projectId | includeLinks |
| [`list_pull_requests`](./pull-requests.md#list_pull_requests) | Lists pull requests in a repository | projectId, repositoryId | status, creatorId, reviewerId, etc. |
| [`get_pull_request`](./pull-requests.md#get_pull_request) | Gets a pull request by ID | projectId, pullRequestId | — |

## Common Use Cases

### Discovering Resources

```typescript
// Step 1: List all projects in the collection
const projects = await mcpClient.callTool('list_projects', {});
const myProject = projects[0].name;

// Step 2: List repositories in a project
const repositories = await mcpClient.callTool('list_repositories', {
  projectId: myProject,
});

// Step 3: List active pull requests
const pullRequests = await mcpClient.callTool('list_pull_requests', {
  projectId: myProject,
  repositoryId: repositories[0].name,
  status: 'active',
});

// Step 4: Get a specific PR by ID
const pr = await mcpClient.callTool('get_pull_request', {
  projectId: myProject,
  pullRequestId: 42,
});
```

### Filtering Projects by State

```typescript
// Only well-formed projects
const projects = await mcpClient.callTool('list_projects', { stateFilter: 1 });
```

### Pagination

```typescript
const page1 = await mcpClient.callTool('list_projects', { top: 10, skip: 0 });
const page2 = await mcpClient.callTool('list_projects', { top: 10, skip: 10 });
```

## Detailed Documentation

- [list_projects / get_project](./projects.md)
- [list_repositories and other repo tools](./repositories.md)
- [list_pull_requests and other PR tools](./pull-requests.md)
