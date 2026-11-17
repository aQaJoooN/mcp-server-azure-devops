# Search Tools

This document describes the search tools available in the Azure DevOps MCP server.

## Azure DevOps Services vs Server base URLs

- **Azure DevOps Services (cloud)** uses the dedicated Search host: `https://almsearch.dev.azure.com/{organization}`.
- **Azure DevOps Server (on-prem)** hosts Search under the same collection URL as the core APIs: `https://{server}/{virtualDir?}/{collection}`.

Set `AZURE_DEVOPS_ORG_URL` to the **collection URL** only. Do not include a project path.

```bash
AZURE_DEVOPS_ORG_URL=https://server:8080/tfs/DefaultCollection
```

---

## search_code

Searches for code across repositories in an Azure DevOps project using the Azure DevOps Search API. Optionally fetches the full content of each matched file.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `searchText` | string | **Yes** | The text to search for |
| `projectId` | string | **Yes** | The ID or name of the project to search in |
| `organizationId` | string | No | Optional organization override (defaults to org in `AZURE_DEVOPS_ORG_URL`) |
| `filters.Repository` | string[] | No | Filter by repository names |
| `filters.Path` | string[] | No | Filter by file paths |
| `filters.Branch` | string[] | No | Filter by branch names |
| `filters.CodeElement` | string[] | No | Filter by code element types (function, class, etc.) |
| `top` | number | No | Results to return (default: 100, max: 1000) |
| `skip` | number | No | Results to skip for pagination (default: 0) |
| `includeSnippet` | boolean | No | Include code snippets in results (default: true) |
| `includeContent` | boolean | No | Fetch full file content for each result (default: true) |

### Response

- `count` — total matching files
- `results[]` — each result contains `fileName`, `path`, `content` (if `includeContent`), `matches`, `collection`, `project`, `repository`, `versions`
- `facets` — aggregated counts by repository, path, etc.

### Examples

```json
{ "searchText": "SearchClass", "projectId": "MyProject" }
```

```json
{
  "searchText": "SearchClass",
  "projectId": "MyProject",
  "filters": { "Repository": ["MyRepo"], "Branch": ["main"] },
  "top": 10,
  "includeContent": false
}
```

### Notes

- When `includeContent` is true the tool makes additional calls to fetch each file — use `includeContent: false` for large result sets.
- The `CodeElement` filter values: `function`, `class`, `method`, `property`, `variable`, `comment`.

---

## search_wiki

Searches wiki pages in Azure DevOps projects.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `searchText` | string | **Yes** | The text to search for |
| `projectId` | string | No | Project to scope the search to (required for Azure DevOps Server) |
| `organizationId` | string | No | Optional organization override |
| `filters.Project` | string[] | No | Filter by project names |
| `top` | number | No | Results to return (default: 100, max: 1000) |
| `skip` | number | No | Results to skip (default: 0) |
| `includeFacets` | boolean | No | Include faceting (default: true) |

### Notes

- Azure DevOps Server requires `projectId`.
- Azure DevOps Services allows organization-wide search when `projectId` is omitted.

---

## search_work_items

Searches work items across Azure DevOps projects.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `searchText` | string | **Yes** | The text to search for |
| `projectId` | string | No | Project to scope the search to (required for Azure DevOps Server) |
| `organizationId` | string | No | Optional organization override |
| `filters.System.TeamProject` | string[] | No | Filter by project names |
| `filters.System.WorkItemType` | string[] | No | Filter by work item types |
| `filters.System.State` | string[] | No | Filter by states |
| `filters.System.AssignedTo` | string[] | No | Filter by assigned users |
| `filters.System.AreaPath` | string[] | No | Filter by area paths |
| `top` | number | No | Results to return (default: 100, max: 1000) |
| `skip` | number | No | Results to skip (default: 0) |
| `includeFacets` | boolean | No | Include faceting (default: true) |
| `orderBy` | array | No | Sort options (`field` + `ASC`/`DESC`) |

### Notes

- Azure DevOps Server requires `projectId`.
- Azure DevOps Services allows organization-wide search when `projectId` is omitted.
