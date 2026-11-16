# AGENTS.md — instructions for AI agents working in this repository

<important-knowledge>
  <read-this-entire-file>docs/important-knowledge/azure-devops-rest-api-research.md</read-this-entire-file>
  <when>Researching Azure DevOps REST APIs, selecting api-version, or handling Azure DevOps Server (on-prem) endpoints.</when>
</important-knowledge>

<important-knowledge>
  <read-this-entire-file>docs/important-knowledge/llm-tldr-cli.md</read-this-entire-file>
  <when>Using llm-tldr CLI for repo analysis or investigating URL-based server selection.</when>
</important-knowledge>

## Project quick-facts

- Language: TypeScript (Node 22, `module: Node16`)
- MCP SDK: `@modelcontextprotocol/sdk` ≥ 1.30
- Two transports are supported:
  - **stdio** — `src/index.ts` / `npm start` — for local AI-assistant integrations
  - **Streamable HTTP** — `src/http-server.ts` / `npm run start:http` — for Docker / JSON-RPC testing
- Build: `npm run build` (tsc), output goes to `dist/`
- Lint/format: `oxlint` + `oxfmt` — run before every commit
- Tests: Jest — unit (`*.spec.unit.ts`), integration (`*.spec.int.ts`), e2e (`*.spec.e2e.ts`)

## Feature directory layout

```
src/features/
  environments/          list_environments
  libraries/             list_libraries
  organizations/         list_organizations
  pipelines/
    get-pipeline/
    get-pipeline-log/
    get-pipeline-run/
    get-pipeline-run-sources/    NEW — get_pipeline_run_sources
    get-pipeline-run-stage-tasks/ NEW — get_pipeline_run_stage_tasks
    get-pipeline-run-yaml/        NEW — get_pipeline_run_yaml
    list-pipeline-runs/
    list-pipelines/
    pipeline-timeline/
    trigger-pipeline/
    download-pipeline-artifact/
  projects/
  pull-requests/
  repositories/
    list-branches/        NEW — list_branches
    list-commits/
    list-tags/            NEW — list_tags
    ... (other existing tools)
  search/
  service-connections/   list_service_connections
  users/
  wikis/
  work-items/
```

## Adding a new tool — checklist

1. Create `src/features/<area>/<tool-name>/` with `schema.ts`, `feature.ts`, `index.ts`
2. Add Zod schema in `schema.ts`; use `toJsonSchema()` from `src/shared/utils/to-json-schema` for the MCP definition
3. Register in the feature's `tool-definitions.ts` and `index.ts` (`isXRequest` + `handleXRequest`)
4. If a **new feature area** (new top-level directory), also import and wire it in `src/server.ts`
5. Write `feature.spec.unit.ts` and `feature.spec.int.ts`

## On-prem Azure DevOps Server notes

- `AZURE_DEVOPS_ORG_URL` must be the **collection** URL only, e.g. `https://host/tfs/Collection`
- The project name goes in `AZURE_DEVOPS_DEFAULT_PROJECT` or in each tool call's `projectId`
- Only PAT authentication works on-prem (`AZURE_DEVOPS_AUTH_METHOD=pat`)
- Set `AZURE_DEVOPS_API_VERSION` to match the server version (e.g. `7.0` for ADO Server 2022)

## Docker usage

```bash
# Build
docker build -t mcp-server-azure-devops:local .

# Run (PAT auth, on-prem example)
docker run -p 8888:3000 \
  -e AZURE_DEVOPS_ORG_URL="https://host/tfs/Collection" \
  -e AZURE_DEVOPS_AUTH_METHOD=pat \
  -e AZURE_DEVOPS_PAT="<token>" \
  -e AZURE_DEVOPS_DEFAULT_PROJECT="MyProject" \
  mcp-server-azure-devops:local

# Health check
curl http://localhost:8888/healthz

# JSON-RPC call example
curl -s -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_projects","arguments":{}}}'
```
