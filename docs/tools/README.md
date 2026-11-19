# Azure DevOps MCP Server — Tools Documentation

This directory documents every tool available in the server. Each page covers parameters, response format, error handling, and examples.

## Navigation

- [Core Navigation](./core-navigation.md) — hierarchy overview and discovery workflow
- [Projects](./projects.md) — `list_projects`, `get_project`, `get_project_details`
- [Repositories](./repositories.md) — `list_repositories`, `get_repository`, `get_file_content`, `create_branch`, `create_commit`, `list_commits`, `list_branches`, `list_tags`, tree tools, `get_commit_details`, `get_commit_diff`, `get_repository_file`, `get_file_history`
- [Pull Requests](./pull-requests.md) — create, get, list, comment, update, checks, changes
- [Work Items](./work-items.md) — get, create, update, list, comments, attachments, links
- [Pipelines](./pipelines.md) — list, get, trigger, runs, logs, timeline, YAML, artifacts, definition, variable groups, resources, agent pool
- [Builds](./builds.md) — build details, timeline, failed tasks, logs, changes, comparison, search
- [Agents](./agents.md) — agent details, capabilities, job history, pool status, image version, environment summary
- [Wikis](./wiki.md) — get, create, list pages, get/update/create page
- [Search](./search.md) — `search_code`, `search_wiki`, `search_work_items`
- [Resource URIs](./resources.md) — accessing repository content via `ado://` URIs

## Read-only mode

When the server is started with `MCP_READ_ONLY=true`, all write tools are removed from this list and blocked at call time. The tools marked **✎ write** below are the ones affected. All others remain available.

## Tools by Category

### Project Tools
- [`list_projects`](./projects.md#list_projects) — list all projects in the collection
- [`get_project`](./projects.md#get_project) — get a specific project by name or ID
- [`get_project_details`](./projects.md#get_project_details) — get extended project info (teams, process, work item types)

### Repository Tools
- [`list_repositories`](./repositories.md#list_repositories) — list all repos in a project
- [`get_repository`](./repositories.md#get_repository) — get a specific repository
- [`get_repository_details`](./repositories.md#get_repository_details) — get detailed repo info including statistics and refs
- [`get_file_content`](./repositories.md#get_file_content) — get a file or directory listing
- [`get_repository_tree`](./repositories.md#get_repository_tree) — get the full directory tree of a repository
- [`get_all_repositories_tree`](./repositories.md#get_all_repositories_tree) — get tree across all repos in a project
- [`create_branch`](./repositories.md#create_branch) ✎ write — create a new branch
- [`create_commit`](./repositories.md#create_commit) ✎ write — commit file changes via patch or search/replace
- [`list_commits`](./repositories.md#list_commits) — list commits on a branch
- [`list_branches`](./repositories.md#list_branches) — list branches with optional filter
- [`list_tags`](./repositories.md#list_tags) — list tags with optional filter
- [`get_commit_details`](./repositories.md#get_commit_details) — get commit metadata, author, message, and timestamp
- [`get_commit_diff`](./repositories.md#get_commit_diff) — get the list of file changes introduced by a commit
- [`get_repository_file`](./repositories.md#get_repository_file) — retrieve a file at a specific branch, commit, or tag
- [`get_file_history`](./repositories.md#get_file_history) — get the commit history of a specific file

### Pull Request Tools
- [`create_pull_request`](./pull-requests.md#create_pull_request) ✎ write — create a new PR
- [`get_pull_request`](./pull-requests.md#get_pull_request) — get a PR by ID
- [`list_pull_requests`](./pull-requests.md#list_pull_requests) — list PRs with filters
- [`add_pull_request_comment`](./pull-requests.md#add_pull_request_comment) ✎ write — add a comment or reply to a thread
- [`get_pull_request_comments`](./pull-requests.md#get_pull_request_comments) — get all comment threads
- [`update_pull_request`](./pull-requests.md#update_pull_request) ✎ write — update title, description, status, reviewers, work items
- [`update_pull_request_thread_status`](./pull-requests.md#update_pull_request_thread_status) ✎ write — set a thread's status
- [`get_pull_request_changes`](./pull-requests.md#get_pull_request_changes) — get changed files and diffs
- [`get_pull_request_checks`](./pull-requests.md#get_pull_request_checks) — get policy evaluations and status checks

### Work Item Tools
- [`get_work_item`](./work-items.md#get_work_item) — get a work item by ID
- [`create_work_item`](./work-items.md#create_work_item) ✎ write — create a new work item
- [`update_work_item`](./work-items.md#update_work_item) ✎ write — update fields on a work item
- [`list_work_items`](./work-items.md#list_work_items) — query work items via WIQL or saved query
- [`get_work_item_comments`](./work-items.md#get_work_item_comments) — get comments on a work item
- [`create_work_item_attachment`](./work-items.md#create_work_item_attachment) ✎ write — upload and attach a file
- [`get_work_item_attachment`](./work-items.md#get_work_item_attachment) — download an attachment
- [`delete_work_item_attachment`](./work-items.md#delete_work_item_attachment) ✎ write — delete an attachment
- [`manage_work_item_link`](./work-items.md#manage_work_item_link) ✎ write — add, update, or remove work item links

### Pipeline Tools
- [`list_pipelines`](./pipelines.md#list_pipelines) — list pipelines in a project
- [`get_pipeline`](./pipelines.md#get_pipeline) — get pipeline definition details
- [`list_pipeline_runs`](./pipelines.md#list_pipeline_runs) — list runs with filters (branch, state, result, date)
- [`get_pipeline_run`](./pipelines.md#get_pipeline_run) — get detailed run info including artifacts
- [`trigger_pipeline`](./pipelines.md#trigger_pipeline) ✎ write — trigger a pipeline run
- [`pipeline_timeline`](./pipelines.md#pipeline_timeline) — get stage/job/task timeline for a run
- [`get_pipeline_log`](./pipelines.md#get_pipeline_log) — get log content for a specific log ID
- [`download_pipeline_artifact`](./pipelines.md#download_pipeline_artifact) — download a file from pipeline artifacts
- [`get_pipeline_run_yaml`](./pipelines.md#get_pipeline_run_yaml) — resolve the full YAML including templates
- [`get_pipeline_run_sources`](./pipelines.md#get_pipeline_run_sources) — get source repositories used in a run
- [`get_pipeline_run_stage_tasks`](./pipelines.md#get_pipeline_run_stage_tasks) — get task details per stage/job
- [`get_pipeline_definition`](./pipelines.md#get_pipeline_definition) — get pipeline definition settings and configuration
- [`get_pipeline_yaml`](./pipelines.md#get_pipeline_yaml) — retrieve the main pipeline YAML from the repository
- [`get_pipeline_template`](./pipelines.md#get_pipeline_template) — retrieve a YAML template file referenced by a pipeline
- [`get_variable_groups`](./pipelines.md#get_variable_groups) — get variable group metadata with secrets masked
- [`get_pipeline_resources`](./pipelines.md#get_pipeline_resources) — get pipeline resource dependencies (repositories, pipelines)
- [`get_agent_pool_details`](./pipelines.md#get_agent_pool_details) — get agent pool configuration for a pipeline definition

### Build Tools
- [`get_build_details`](./builds.md#get_build_details) — get build status, branch, commit, and definition details
- [`get_build_timeline`](./builds.md#get_build_timeline) — get the execution timeline of stages, jobs, and tasks
- [`get_failed_tasks`](./builds.md#get_failed_tasks) — identify failed and canceled tasks in a build
- [`get_task_log`](./builds.md#get_task_log) — retrieve logs for a specific task by log ID
- [`get_build_logs`](./builds.md#get_build_logs) — list all available build log entries
- [`compare_builds`](./builds.md#compare_builds) — compare two builds to find differences
- [`get_build_changes`](./builds.md#get_build_changes) — get source code changes associated with a build
- [`search_failed_builds`](./builds.md#search_failed_builds) — search historical failed builds with filters
- [`get_last_successful_build`](./builds.md#get_last_successful_build) — get the most recent successful build for a pipeline
- [`compare_failed_successful_builds`](./builds.md#compare_failed_successful_builds) — compare a failed build against the last successful one

### Agent Tools
- [`get_agent_details`](./agents.md#get_agent_details) — get agent information, status, and configuration
- [`get_agent_capabilities`](./agents.md#get_agent_capabilities) — get installed tools, software versions, and capabilities
- [`get_agent_job_history`](./agents.md#get_agent_job_history) — get historical jobs executed by an agent
- [`get_agent_pool_status`](./agents.md#get_agent_pool_status) — get pool availability, capacity, and operational status
- [`get_agent_image_version`](./agents.md#get_agent_image_version) — get container image name, tag, and version for k8s agents
- [`get_agent_environment_summary`](./agents.md#get_agent_environment_summary) — get a sanitized agent environment summary (secrets excluded)

### Wiki Tools
- [`get_wikis`](./wiki.md#get_wikis) — list wikis in a project
- [`create_wiki`](./wiki.md#create_wiki) ✎ write — create a new wiki
- [`get_wiki_page`](./wiki.md#get_wiki_page) — get a wiki page's markdown content
- [`create_wiki_page`](./wiki.md#create_wiki_page) ✎ write — create a new wiki page
- [`update_wiki_page`](./wiki.md#update_wiki_page) ✎ write — update a wiki page
- [`list_wiki_pages`](./wiki.md#list_wiki_pages) — list all pages in a wiki

### Search Tools
- [`search_code`](./search.md#search_code) — full-text code search across repositories
- [`search_wiki`](./search.md#search_wiki) — search wiki pages
- [`search_work_items`](./search.md#search_work_items) — search work items

### Infrastructure Tools
- [`list_environments`](./pipelines.md#list_environments) — list deployment environments
- [`list_libraries`](./pipelines.md#list_libraries) — list variable groups (Libraries)
- [`list_service_connections`](./pipelines.md#list_service_connections) — list service endpoints
- [`get_variable_groups`](./pipelines.md#get_variable_groups) — get variable group metadata with secrets masked
- [`get_agent_pool_details`](./pipelines.md#get_agent_pool_details) — get agent pool configuration for a pipeline definition
- [`get_agent_pool_status`](./agents.md#get_agent_pool_status) — get agent pool availability and capacity

## Removed Tools

The following tools were **removed** because they call Azure DevOps Services-only APIs that do not exist on on-premises servers:

| Tool | Reason |
|------|--------|
| `list_organizations` | Calls `app.vssps.visualstudio.com` — cloud only |
| `get_me` | Calls `vssps.dev.azure.com` — cloud only |

Use `list_projects` to discover what's available on your server.
