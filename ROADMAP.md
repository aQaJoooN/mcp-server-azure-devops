# Roadmap

This community server continues alongside Microsoft's product-supported Azure DevOps MCP
([microsoft/azure-devops-mcp](https://github.com/microsoft/azure-devops-mcp)).
If you use Azure DevOps Services (cloud), start with the official server.
See [Discussion #237](https://github.com/Tiberriver256/mcp-server-azure-devops/discussions/237).

## Where this server differentiates

1. **Azure DevOps Server (on-premises) support** — including older versions the
   official server may not work with. PAT auth against a collection URL
   (e.g. `https://server:8080/tfs/DefaultCollection`) is the primary path.
2. **Docker / HTTP transport** — run the server as a container and talk to it
   via JSON-RPC over HTTP (Streamable-HTTP transport), matching the pattern
   used by [kubernetes-mcp-server](https://github.com/containers/kubernetes-mcp-server).
3. **Pipeline inspection depth** — YAML, sources, stage tasks, and logs exposed
   as individual tools so an AI can drill into a failed run step by step.
4. **Project-level resource discovery** — environments, libraries (variable groups),
   and service connections as first-class tools.
5. **Stability for automation** — conservative dependency upgrades, integration
   tests against real Azure DevOps, reproducible CI.

## Recently completed

- [x] **Docker / Streamable-HTTP transport** (`src/http-server.ts`, `Dockerfile`,
  `docker-compose.yml`) — run as a container, test with raw JSON-RPC.
- [x] `list_branches` — list branches in a repository with optional filter
- [x] `list_tags` — list tags in a repository with optional filter
- [x] `list_environments` — list deployment environments in a project
- [x] `list_libraries` — list variable groups (Libraries) in a project
- [x] `list_service_connections` — list service connections in a project
- [x] `get_pipeline_run_yaml` — retrieve the final expanded YAML of a run
- [x] `get_pipeline_run_sources` — repositories, branches, and commit versions used
- [x] `get_pipeline_run_stage_tasks` — stage → job → task hierarchy with logIds

## Near term

- [ ] Keep dependencies secure: weekly Dependabot, `npm audit --audit-level=high`
  in CI, conservative minor bumps first.
- [ ] Integration tests for all new tools (`list_branches`, `list_tags`,
  `list_environments`, `list_libraries`, `list_service_connections`,
  `get_pipeline_run_yaml`, `get_pipeline_run_sources`, `get_pipeline_run_stage_tasks`).
- [ ] Evaluate `azure-devops-node-api` v13 → v17 major upgrade on a dedicated
  branch with full unit + integration runs.
- [ ] Prune stale bot/dependabot branches and keep the release-please flow
  current.

## Non-goals

- Duplicating everything the official Microsoft server already does well for
  Azure DevOps Services cloud users.
- Breaking on-prem compatibility to chase cloud-only APIs.

## How to contribute

Open an issue noting whether your scenario is **Azure DevOps Services** or
**Azure DevOps Server (version)** — on-prem reports get priority here.
