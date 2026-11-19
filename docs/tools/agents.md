# Agent Tools

This document describes the tools available for investigating Azure DevOps build agents and agent pools. These tools query the DistributedTask API and work at the collection level (no `projectId` required).

## Table of Contents

- [`get_agent_details`](#get_agent_details) — get agent information, status, and configuration
- [`get_agent_capabilities`](#get_agent_capabilities) — get installed tools, software versions, and capabilities
- [`get_agent_job_history`](#get_agent_job_history) — get historical jobs executed by an agent
- [`get_agent_pool_status`](#get_agent_pool_status) — get pool availability, capacity, and operational status
- [`get_agent_image_version`](#get_agent_image_version) — get container image name, tag, and version for k8s agents
- [`get_agent_environment_summary`](#get_agent_environment_summary) — get a sanitized agent environment summary

---

## get_agent_details

Retrieves agent information, status, and configuration from an agent pool.

### Parameters

| Parameter             | Type    | Required | Description                                            |
| --------------------- | ------- | -------- | ------------------------------------------------------ |
| `poolId`              | number  | Yes      | The ID of the agent pool                               |
| `agentId`             | number  | Yes      | The ID of the agent                                    |
| `includeCapabilities` | boolean | No       | Whether to include agent capabilities (default: false) |

### Response

Returns the agent object:

```json
{
  "id": 1,
  "name": "build-agent-01",
  "status": "online",
  "version": "3.245.0",
  "osDescription": "Linux 5.15.0",
  "enabled": true,
  "provisioningState": "Provisioned",
  "systemCapabilities": { "Node.js": "20.10.0" }
}
```

### Example

```javascript
const agent = await callTool('get_agent_details', {
  poolId: 1,
  agentId: 1,
  includeCapabilities: true,
});
```

---

## get_agent_capabilities

Retrieves installed tools, software versions, and agent capabilities (system and user-defined).

### Parameters

| Parameter | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| `poolId`  | number | Yes      | The ID of the agent pool     |
| `agentId` | number | Yes      | The ID of the agent          |

### Response

Returns a split view of capabilities:

```json
{
  "agentId": 1,
  "agentName": "build-agent-01",
  "systemCapabilities": {
    "JAVA_HOME": "/usr/lib/jvm/java-17",
    "Node.js": "20.10.0",
    "Docker": "24.0.7"
  },
  "userCapabilities": {
    "build_env": "production"
  }
}
```

### Example

```javascript
const caps = await callTool('get_agent_capabilities', {
  poolId: 1,
  agentId: 1,
});
```

---

## get_agent_job_history

Retrieves historical jobs (job requests) executed by a specific agent.

### Parameters

| Parameter | Type   | Required | Description                                         |
| --------- | ------ | -------- | --------------------------------------------------- |
| `poolId`  | number | Yes      | The ID of the agent pool                            |
| `agentId` | number | Yes      | The ID of the agent                                 |
| `top`     | number | No       | Maximum number of job records (default 25, max 200) |

### Response

Returns an array of job request objects:

```json
[
  {
    "requestId": 100,
    "queueTime": "2024-01-01T10:00:00Z",
    "finishTime": "2024-01-01T10:05:00Z",
    "result": "succeeded",
    "planType": "Build",
    "definition": { "id": 10, "name": "CI Build" }
  }
]
```

### Example

```javascript
const history = await callTool('get_agent_job_history', {
  poolId: 1,
  agentId: 1,
  top: 50,
});
```

---

## get_agent_pool_status

Retrieves agent pool availability, capacity, and operational status. Fetches the pool and all its agents in parallel, then computes a summary.

### Parameters

| Parameter | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| `poolId`  | number | Yes      | The ID of the agent pool     |

### Response

```json
{
  "pool": { "id": 1, "name": "Default", "size": 3, "isHosted": false, "poolType": "automation" },
  "agents": [
    { "id": 1, "name": "agent-1", "status": "online", "enabled": true, "version": "3.245.0" },
    { "id": 2, "name": "agent-2", "status": "offline", "enabled": true, "version": "3.245.0" }
  ],
  "summary": {
    "total": 2,
    "online": 1,
    "offline": 1,
    "enabled": 2,
    "disabled": 0
  }
}
```

### Example

```javascript
const status = await callTool('get_agent_pool_status', {
  poolId: 1,
});
```

---

## get_agent_image_version

Retrieves the container image name, tag, and version used by Kubernetes-based agents. Scans system and user capabilities for image/container/docker/k8s-related keys.

### Parameters

| Parameter | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| `poolId`  | number | Yes      | The ID of the agent pool     |
| `agentId` | number | Yes      | The ID of the agent          |

### Response

```json
{
  "agentId": 1,
  "agentName": "k8s-agent-01",
  "agentVersion": "3.245.0",
  "imageVersion": "20240601.1",
  "containerImage": "my-registry/agent:latest",
  "rawCapabilities": {
    "ImageVersion": "20240601.1",
    "ContainerImage": "my-registry/agent:latest"
  }
}
```

When no image-related capabilities are found, `imageVersion` and `containerImage` are `null` and `rawCapabilities` is an empty object.

### Example

```javascript
const image = await callTool('get_agent_image_version', {
  poolId: 5,
  agentId: 3,
});
```

---

## get_agent_environment_summary

Retrieves a sanitized summary of the agent environment and runtime configuration. Filters out any capability key that contains sensitive substrings (`token`, `secret`, `password`, `key`, `pat`, `credential`) to avoid exposing secrets.

### Parameters

| Parameter | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| `poolId`  | number | Yes      | The ID of the agent pool     |
| `agentId` | number | Yes      | The ID of the agent          |

### Response

```json
{
  "agentId": 1,
  "agentName": "build-agent-01",
  "status": "online",
  "version": "3.245.0",
  "osDescription": "Linux 5.15.0",
  "systemCapabilities": {
    "JAVA_HOME": "/usr/lib/jvm/java-17",
    "Node.js": "20.10.0"
  },
  "userCapabilities": {
    "build_env": "production"
  }
}
```

Any capability whose key matches a sensitive pattern is excluded from both `systemCapabilities` and `userCapabilities`.

### Example

```javascript
const env = await callTool('get_agent_environment_summary', {
  poolId: 1,
  agentId: 1,
});
```
