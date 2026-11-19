# Build Tools

This document describes the tools available for investigating Azure DevOps builds. These tools cover build execution details, timeline analysis, failure investigation, and historical build comparison.

## Table of Contents

- [`get_build_details`](#get_build_details) — get build status, branch, commit, and definition details
- [`get_build_timeline`](#get_build_timeline) — get the execution timeline of stages, jobs, and tasks
- [`get_failed_tasks`](#get_failed_tasks) — identify failed and canceled tasks in a build
- [`get_task_log`](#get_task_log) — retrieve logs for a specific task by log ID
- [`get_build_logs`](#get_build_logs) — list all available build log entries
- [`compare_builds`](#compare_builds) — compare two builds to find differences
- [`get_build_changes`](#get_build_changes) — get source code changes associated with a build
- [`search_failed_builds`](#search_failed_builds) — search historical failed builds with filters
- [`get_last_successful_build`](#get_last_successful_build) — get the most recent successful build for a pipeline
- [`compare_failed_successful_builds`](#compare_failed_successful_builds) — compare a failed build against the last successful one

---

## get_build_details

Retrieves build status, branch, commit, definition, and execution details.

### Parameters

| Parameter   | Type   | Required | Description                          |
| ---------- | ------ | -------- | ------------------------------------ |
| `projectId` | string | Yes      | The ID or name of the project        |
| `buildId`   | number | Yes      | The numeric ID of the build          |

### Response

Returns the full build object:

```json
{
  "id": 42,
  "buildNumber": "20240101.1",
  "status": "completed",
  "result": "succeeded",
  "sourceBranch": "refs/heads/main",
  "sourceVersion": "abc123def456",
  "definition": { "id": 10, "name": "CI Build" },
  "startTime": "2024-01-01T10:00:00Z",
  "finishTime": "2024-01-01T10:05:00Z",
  "requestedBy": { "displayName": "Alice", "uniqueName": "alice@test.com" }
}
```

### Error Handling

- `AzureDevOpsResourceNotFoundError` — build or project not found (404)
- `AzureDevOpsAuthenticationError` — authentication failed (401)
- `AzureDevOpsError` — other failures

### Example

```javascript
const build = await callTool('get_build_details', {
  projectId: 'my-project',
  buildId: 42,
});
```

---

## get_build_timeline

Retrieves the execution timeline of pipeline stages, jobs, and tasks for a build.

### Parameters

| Parameter    | Type   | Required | Description                                      |
| ------------ | ------ | -------- | ------------------------------------------------ |
| `projectId`  | string | Yes      | The ID or name of the project                     |
| `buildId`    | number | Yes      | The numeric ID of the build                       |
| `timelineId` | string | No       | Fetch a specific timeline record (optional)        |

### Response

Returns the timeline object with all records:

```json
{
  "id": "f9d9c210-06c7-4e53-b45f-6b661341fa7f",
  "records": [
    {
      "id": "Stage_1",
      "name": "Build",
      "type": "Stage",
      "state": "completed",
      "result": "succeeded",
      "startTime": "2024-01-01T10:00:30Z",
      "finishTime": "2024-01-01T10:02:10Z"
    },
    {
      "id": "Job_1",
      "name": "Agent job",
      "type": "Job",
      "parentId": "Stage_1",
      "log": { "id": 5 }
    }
  ]
}
```

### Example

```javascript
const timeline = await callTool('get_build_timeline', {
  projectId: 'my-project',
  buildId: 42,
});
```

---

## get_failed_tasks

Identifies failed and canceled tasks within a build by filtering the timeline records.

### Parameters

| Parameter   | Type   | Required | Description                          |
| ---------- | ------ | -------- | ------------------------------------ |
| `projectId` | string | Yes      | The ID or name of the project        |
| `buildId`   | number | Yes      | The numeric ID of the build          |

### Response

Returns an array of timeline records where the result is `failed` or `canceled`. Each record includes the task name, type, state, result, start/finish times, and log ID:

```json
[
  {
    "id": "Task_3",
    "name": "Run tests",
    "type": "Task",
    "state": "completed",
    "result": "failed",
    "startTime": "2024-01-01T10:03:00Z",
    "finishTime": "2024-01-01T10:03:30Z",
    "log": { "id": 12 }
  }
]
```

### Example

```javascript
const failed = await callTool('get_failed_tasks', {
  projectId: 'my-project',
  buildId: 42,
});
// Use the log ID to fetch logs with get_task_log
```

---

## get_task_log

Retrieves log content for a specific pipeline task by its log ID (obtained from timeline records).

### Parameters

| Parameter   | Type   | Required | Description                                   |
| ---------- | ------ | -------- | --------------------------------------------- |
| `projectId` | string | Yes      | The ID or name of the project                 |
| `buildId`   | number | Yes      | The numeric ID of the build                    |
| `logId`     | number | Yes      | Log identifier from the timeline record        |
| `startLine` | number | No       | Starting line number for partial retrieval     |
| `endLine`   | number | No       | Ending line number for partial retrieval       |

### Response

Returns plain text log content (newline-delimited):

```text
Starting: Run tests
##[section]Starting: npm test
> mocha
  42 passing
  1 failing
```

### Example

```javascript
const log = await callTool('get_task_log', {
  projectId: 'my-project',
  buildId: 42,
  logId: 12,
  startLine: 0,
  endLine: 100,
});
```

---

## get_build_logs

Retrieves the list of available log entries for a build. Each entry has a `logId` you can pass to `get_task_log`.

### Parameters

| Parameter   | Type   | Required | Description                          |
| ---------- | ------ | -------- | ------------------------------------ |
| `projectId` | string | Yes      | The ID or name of the project        |
| `buildId`   | number | Yes      | The numeric ID of the build          |

### Response

Returns an array of log objects:

```json
[
  { "id": 1, "type": "Container", "lineCount": 5 },
  { "id": 5, "type": "Container", "lineCount": 42 }
]
```

### Example

```javascript
const logs = await callTool('get_build_logs', {
  projectId: 'my-project',
  buildId: 42,
});
```

---

## compare_builds

Compares two builds to identify differences in execution and configuration.

### Parameters

| Parameter   | Type   | Required | Description                          |
| ---------- | ------ | -------- | ------------------------------------ |
| `projectId` | string | Yes      | The ID or name of the project        |
| `buildId1`  | number | Yes      | The numeric ID of the first build    |
| `buildId2`  | number | Yes      | The numeric ID of the second build   |

### Response

Returns both build summaries and an array of differences:

```json
{
  "build1": { "id": 10, "buildNumber": "1.0", "result": "succeeded" },
  "build2": { "id": 11, "buildNumber": "2.0", "result": "failed" },
  "differences": [
    { "field": "result", "build1": "succeeded", "build2": "failed" },
    { "field": "buildNumber", "build1": "1.0", "build2": "2.0" },
    { "field": "definition.id", "build1": 10, "build2": 10 }
  ]
}
```

### Example

```javascript
const comparison = await callTool('compare_builds', {
  projectId: 'my-project',
  buildId1: 10,
  buildId2: 11,
});
```

---

## get_build_changes

Retrieves source code changes (commits) associated with a build.

### Parameters

| Parameter   | Type   | Required | Description                              |
| ---------- | ------ | -------- | ---------------------------------------- |
| `projectId` | string | Yes      | The ID or name of the project            |
| `buildId`   | number | Yes      | The numeric ID of the build              |
| `top`       | number | No       | Maximum number of changes to return (max 200) |

### Response

Returns an array of change objects:

```json
[
  {
    "id": "abc123",
    "message": "fix: handle null reference in parser",
    "author": { "displayName": "Alice", "uniqueName": "alice@test.com" },
    "timestamp": "2024-01-01T09:30:00Z",
    "location": "refs/heads/main"
  }
]
```

### Example

```javascript
const changes = await callTool('get_build_changes', {
  projectId: 'my-project',
  buildId: 42,
  top: 50,
});
```

---

## search_failed_builds

Searches historical failed builds based on filters such as definition, branch, and date range.

### Parameters

| Parameter     | Type   | Required | Description                                              |
| ------------- | ------ | -------- | ------------------------------------------------------- |
| `projectId`   | string | Yes      | The ID or name of the project                            |
| `definitionId`| number | No       | Pipeline definition ID to filter by                      |
| `branchName`  | string | No       | Branch name filter (e.g. `refs/heads/main`)               |
| `top`         | number | No       | Maximum results (default 25, max 200)                    |
| `minTime`     | string | No       | ISO 8601 start date/time filter                          |
| `maxTime`     | string | No       | ISO 8601 end date/time filter                            |

### Response

Returns an array of failed build summaries (same structure as `get_build_details`).

### Example

```javascript
const failed = await callTool('search_failed_builds', {
  projectId: 'my-project',
  definitionId: 10,
  branchName: 'refs/heads/main',
  top: 20,
  minTime: '2024-01-01T00:00:00Z',
});
```

---

## get_last_successful_build

Retrieves the most recent successful build for a pipeline definition, optionally on a specific branch.

### Parameters

| Parameter     | Type   | Required | Description                                     |
| ------------- | ------ | -------- | ----------------------------------------------- |
| `projectId`   | string | Yes      | The ID or name of the project                    |
| `definitionId`| number | Yes      | The pipeline definition ID                       |
| `branchName`  | string | No       | Optional branch name filter                      |

### Response

Returns the single most recent successful build, or the text `"No successful build found"` when none exists.

### Example

```javascript
const last = await callTool('get_last_successful_build', {
  projectId: 'my-project',
  definitionId: 10,
  branchName: 'refs/heads/main',
});
```

---

## compare_failed_successful_builds

Compares a failed build against the last successful build to identify potential failure causes. It automatically finds the last successful build on the same branch and definition, then diffs key fields and includes the changes introduced in the failed build.

### Parameters

| Parameter      | Type   | Required | Description                                                        |
| -------------- | ------ | -------- | ----------------------------------------------------------------- |
| `projectId`    | string | Yes      | The ID or name of the project                                      |
| `failedBuildId`| number | Yes      | The numeric ID of the failed build                                 |
| `definitionId` | number | No       | Pipeline definition ID; inferred from the failed build when omitted|
| `branchName`   | string | No       | Restrict the successful-build search to a specific branch          |

### Response

Returns the failed build, the last successful build (or null), field-level differences, and changes introduced in the failed build:

```json
{
  "failedBuild": { "id": 11, "result": "failed" },
  "lastSuccessfulBuild": { "id": 9, "result": "succeeded" },
  "differences": [
    { "field": "result", "failed": "failed", "successful": "succeeded" }
  ],
  "changesInFailedBuild": [
    { "id": "abc123", "message": "feat: new dependency" }
  ]
}
```

### Example

```javascript
const analysis = await callTool('compare_failed_successful_builds', {
  projectId: 'my-project',
  failedBuildId: 11,
});
```
