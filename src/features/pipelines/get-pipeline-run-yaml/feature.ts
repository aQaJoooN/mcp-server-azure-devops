import { WebApi } from 'azure-devops-node-api';
import { GitVersionType } from 'azure-devops-node-api/interfaces/GitInterfaces';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion, defaultProject } from '../../../utils/environment';
import { z } from 'zod';
import { GetPipelineRunYamlSchema } from './schema';

export type GetPipelineRunYamlOptions = z.infer<typeof GetPipelineRunYamlSchema>;

const API_VERSION = apiVersion;

/** A single YAML file found during template resolution. */
export interface PipelineYamlFile {
  /** Descriptive label, e.g. "pipeline.yaml (self@dev)" or "HrmTemplate/Build/main.yaml (hrm@2.0.5)" */
  label: string;
  /** Repository alias from the resources section, or "self" for the main pipeline repo. */
  repositoryAlias: string;
  /** Repository name as declared in the resources (e.g. "DevEx/hrm" or "bank_switch_deposit"). */
  repositoryName: string;
  /** Branch or tag ref used to fetch the file. */
  ref: string;
  /** Full path to the file inside the repository. */
  path: string;
  /** Raw file content. */
  content: string;
}

export interface PipelineRunYamlResult {
  runId: number;
  pipelineId?: number;
  /** The main pipeline YAML path from the pipeline definition. */
  pipelinePath: string;
  /** All resolved YAML files, including the main pipeline file and all templates. */
  files: PipelineYamlFile[];
}

/**
 * Represents a repository resource declared in the pipeline YAML.
 */
interface RepoResource {
  alias: string;
  name: string; // e.g. "DevEx/hrm" or "bank_switch_deposit"
  ref: string; // e.g. "dev" or "refs/tags/2.0.5"
  type: string; // e.g. "git"
}

/**
 * Parses a ref string into a GitVersionType and a clean version string.
 * - "dev" → { type: Branch, version: "dev" }
 * - "refs/heads/main" → { type: Branch, version: "main" }
 * - "refs/tags/2.0.5" → { type: Tag, version: "2.0.5" }
 */
function parseRef(ref: string): {
  versionType: number;
  version: string;
} {
  if (ref.startsWith('refs/tags/')) {
    return {
      versionType: GitVersionType.Tag,
      version: ref.replace('refs/tags/', ''),
    };
  }
  if (ref.startsWith('refs/heads/')) {
    return {
      versionType: GitVersionType.Branch,
      version: ref.replace('refs/heads/', ''),
    };
  }
  // Default: treat as branch name
  return { versionType: GitVersionType.Branch, version: ref };
}

/**
 * Parses the `resources.repositories` section from a YAML string.
 * Returns a map of alias → RepoResource.
 */
function parseResources(yamlContent: string): Map<string, RepoResource> {
  const resources = new Map<string, RepoResource>();
  const lines = yamlContent.split('\n');

  let inResources = false;
  let inRepos = false;
  let currentRepo: Partial<RepoResource> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect "resources:" at top level
    if (/^resources:\s*$/.test(line.trimEnd())) {
      inResources = true;
      inRepos = false;
      continue;
    }

    // Detect "repositories:" under resources
    if (inResources && /^repositories:\s*$/.test(trimmed)) {
      inRepos = true;
      continue;
    }

    // Exit resources section when we hit a non-indented line that's not a comment
    if (inResources && line.length > 0 && !line.startsWith(' ') && !line.startsWith('#') && trimmed !== '') {
      if (currentRepo && currentRepo.alias) {
        resources.set(currentRepo.alias, currentRepo as RepoResource);
      }
      currentRepo = null;
      inResources = false;
      inRepos = false;
    }

    if (inRepos) {
      // New repo entry: "- repository: alias"
      const repoMatch = line.match(/^\s*-\s+repository:\s*(\S+)\s*$/);
      if (repoMatch) {
        if (currentRepo && currentRepo.alias) {
          resources.set(currentRepo.alias, currentRepo as RepoResource);
        }
        currentRepo = { alias: repoMatch[1], type: 'git' };
        continue;
      }

      // Properties of current repo
      if (currentRepo) {
        const nameMatch = trimmed.match(/^name:\s*(.+)$/);
        if (nameMatch) {
          currentRepo.name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
          continue;
        }
        const refMatch = trimmed.match(/^ref:\s*(.+)$/);
        if (refMatch) {
          currentRepo.ref = refMatch[1].trim().replace(/^["']|["']$/g, '');
          continue;
        }
        const typeMatch = trimmed.match(/^type:\s*(.+)$/);
        if (typeMatch) {
          currentRepo.type = typeMatch[1].trim();
          continue;
        }
      }
    }
  }

  // Don't forget the last repo
  if (currentRepo && currentRepo.alias) {
    resources.set(currentRepo.alias, currentRepo as RepoResource);
  }

  return resources;
}

/**
 * Extracts all template references from a YAML string.
 * Handles:
 *   - template: /path/to/file.yaml@repoAlias
 *   - template: ./relative/path.yaml
 *   - template: relative/path.yaml
 *   - template: path.yaml
 * Returns array of { path, repoAlias | null }
 */
function extractTemplateRefs(
  yamlContent: string,
): Array<{ path: string; repoAlias: string | null }> {
  const refs: Array<{ path: string; repoAlias: string | null }> = [];
  const lines = yamlContent.split('\n');
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    // Match: - template: path@alias  or  template: path@alias
    const match = trimmed.match(/^(?:-\s+)?template:\s*(.+?)(?:@(\S+))?\s*$/);
    if (match) {
      let templatePath = match[1].trim().replace(/^["']|["']$/g, '');
      const alias = match[2] ? match[2].trim() : null;

      // Normalize path: remove leading slash for @repo refs (Azure DevOps uses /path@repo)
      if (alias && templatePath.startsWith('/')) {
        templatePath = templatePath.substring(1);
      }

      const key = `${templatePath}@${alias ?? 'self'}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ path: templatePath, repoAlias: alias });
      }
    }
  }

  return refs;
}

/**
 * Resolves a relative template path against a base file path.
 * e.g. base="HrmTemplate/main.yaml", rel="./Build/main.yaml" → "HrmTemplate/Build/main.yaml"
 *      base="HrmTemplate/Build/main.yaml", rel="./Docker/main.yaml" → "HrmTemplate/Build/Docker/main.yaml"
 *      base="pipeline.yaml", rel="./sub/file.yaml" → "sub/file.yaml"
 *
 * When hasRepoAlias is true, the path is absolute from the target repo root
 * (no base directory resolution needed).
 */
function resolvePath(
  basePath: string,
  templatePath: string,
  hasRepoAlias = false,
): string {
  // If it starts with / it's absolute from repo root
  if (templatePath.startsWith('/')) {
    return templatePath.substring(1);
  }

  // If there's a repo alias and the path doesn't start with ./ or ../,
  // treat it as absolute from the target repo root
  if (hasRepoAlias && !templatePath.startsWith('./') && !templatePath.startsWith('../')) {
    return templatePath;
  }

  // If it starts with ./ resolve relative to base file's directory
  if (templatePath.startsWith('./') || templatePath.startsWith('../')) {
    const baseDir = basePath.includes('/')
      ? basePath.substring(0, basePath.lastIndexOf('/'))
      : '';
    const parts = baseDir ? baseDir.split('/') : [];
    for (const seg of templatePath.split('/')) {
      if (seg === '.' || seg === '') continue;
      if (seg === '..') {
        parts.pop();
        continue;
      }
      parts.push(seg);
    }
    return parts.join('/');
  }

  // Bare relative path (no ./ prefix) — resolve from base directory
  // but only if there's no repo alias (with repo alias it's already handled above)
  const baseDir = basePath.includes('/')
    ? basePath.substring(0, basePath.lastIndexOf('/'))
    : '';
  return baseDir ? `${baseDir}/${templatePath}` : templatePath;
}

/**
 * Fetches a file from a Git repository using the Azure DevOps REST API.
 */
async function fetchFile(
  connection: WebApi,
  projectId: string,
  repositoryId: string,
  path: string,
  versionType?: number,
  version?: string,
): Promise<string> {
  const gitApi = await connection.getGitApi();
  const stream = await gitApi.getItemContent(
    repositoryId,
    path,
    projectId,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    versionType !== undefined && version !== undefined
      ? { versionType, version }
      : undefined,
  );
  if (!stream) {
    throw new AzureDevOpsResourceNotFoundError(
      `File not found: ${path} in ${repositoryId}`,
    );
  }
  // Read the Node.js ReadableStream into a string
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Gets the pipeline definition to find the YAML path and repository.
 */
async function getPipelineDefinition(
  connection: WebApi,
  projectId: string,
  pipelineId: number,
): Promise<{ path: string; repositoryId: string }> {
  const pipelinesApi = await connection.getPipelinesApi();
  const baseUrl = connection.serverUrl.replace(/\/+$/, '');
  const encodedProject = encodeURIComponent(projectId);

  const url = new URL(`${encodedProject}/_apis/pipelines/${pipelineId}`, `${baseUrl}/`);
  url.searchParams.set('api-version', API_VERSION);

  const requestOptions = pipelinesApi.createRequestOptions('application/json', API_VERSION);
  const response = await pipelinesApi.rest.get<{
    configuration?: {
      path?: string;
      repository?: { id?: string; type?: string | number };
    };
  } | null>(url.toString(), requestOptions);

  if (!response.result?.configuration?.path) {
    throw new AzureDevOpsResourceNotFoundError(`Pipeline ${pipelineId} has no YAML configuration path`);
  }

  return {
    path: response.result.configuration.path,
    repositoryId: response.result.configuration.repository?.id ?? '',
  };
}

/**
 * Gets the build definition to find the pipeline ID from a build/run ID.
 * On-prem TFS may not have the Pipelines API, so we use the Build API instead.
 */
async function getBuildDefinition(
  connection: WebApi,
  projectId: string,
  runId: number,
): Promise<{ pipelineId: number; definitionId: number; repositoryId: string; yamlPath: string; sourceBranch: string }> {
  const buildApi = await connection.getBuildApi();
  const baseUrl = connection.serverUrl.replace(/\/+$/, '');
  const encodedProject = encodeURIComponent(projectId);

  // Try the Build API first (works on all TFS versions)
  const url = new URL(`${encodedProject}/_apis/build/builds/${runId}`, `${baseUrl}/`);
  url.searchParams.set('api-version', API_VERSION);

  const requestOptions = buildApi.createRequestOptions('application/json', API_VERSION);
  const response = await buildApi.rest.get<{
    definition?: { id?: number; name?: string };
    repository?: { id?: string; name?: string; type?: string };
    sourceBranch?: string;
  } | null>(url.toString(), requestOptions);

  if (!response.result?.definition?.id) {
    throw new AzureDevOpsResourceNotFoundError(`Build ${runId} not found in project ${projectId}`);
  }

  const definitionId = response.result.definition.id;
  const repositoryId = response.result.repository?.id ?? '';
  const sourceBranch = response.result.sourceBranch ?? '';

  // Try the Pipelines API for the YAML path
  let yamlPath = '';
  let pipelineId = definitionId;
  try {
    const def = await getPipelineDefinition(connection, projectId, definitionId);
    yamlPath = def.path;
    if (def.repositoryId) {
      // Pipeline definition has the authoritative repo ID
    }
    pipelineId = definitionId;
  } catch {
    // If Pipelines API fails (older TFS), try getting the definition from Build API
    const defUrl = new URL(`${encodedProject}/_apis/build/definitions/${definitionId}`, `${baseUrl}/`);
    defUrl.searchParams.set('api-version', API_VERSION);
    const defResponse = await buildApi.rest.get<{
      process?: { yamlFilename?: string; type?: number };
      repository?: { id?: string; name?: string; defaultBranch?: string };
    } | null>(defUrl.toString(), requestOptions);

    if (defResponse.result?.process?.yamlFilename) {
      yamlPath = defResponse.result.process.yamlFilename;
    }
    if (defResponse.result?.repository?.id && !repositoryId) {
      // Use the definition's repo
    }
  }

  return {
    pipelineId,
    definitionId,
    repositoryId,
    yamlPath,
    sourceBranch,
  };
}

/**
 * Main entry point: resolves the full YAML for a pipeline run by fetching
 * the pipeline YAML file and recursively resolving all template references.
 *
 * On Azure DevOps Services (cloud), the `finalYaml` field on the run object
 * gives the fully expanded YAML. On-prem TFS does not expose this, so we
 * manually resolve templates by:
 * 1. Finding the pipeline definition → YAML path + repo
 * 2. Fetching the main YAML file
 * 3. Parsing `resources.repositories` for repo aliases and refs
 * 4. Parsing `template:` references and recursively fetching each template
 * 5. Returning all files in a structured result
 */
export async function getPipelineRunYaml(
  connection: WebApi,
  options: GetPipelineRunYamlOptions,
): Promise<PipelineRunYamlResult> {
  try {
    const projectId = options.projectId ?? defaultProject;
    const { runId, pipelineId } = options;

    // Step 1: Get the pipeline definition to find YAML path + repo
    let yamlPath = '';
    let mainRepoId = '';
    let mainRepoRef = '';
    let resolvedPipelineId = pipelineId;

    if (pipelineId) {
      try {
        const def = await getPipelineDefinition(connection, projectId, pipelineId);
        yamlPath = def.path;
        mainRepoId = def.repositoryId;
      } catch {
        // Fall through to build lookup
      }
    }

    if (!yamlPath) {
      // Use the build/run to find the definition
      const buildDef = await getBuildDefinition(connection, projectId, runId);
      yamlPath = buildDef.yamlPath;
      mainRepoId = buildDef.repositoryId;
      mainRepoRef = buildDef.sourceBranch;
      resolvedPipelineId = buildDef.pipelineId;
    }

    if (!yamlPath) {
      return {
        runId,
        pipelineId: resolvedPipelineId,
        pipelinePath: '(unknown)',
        files: [{
          label: 'pipeline.yaml',
          repositoryAlias: 'self',
          repositoryName: mainRepoId,
          ref: mainRepoRef,
          path: '(unknown)',
          content: '# Could not determine the pipeline YAML path for this run.\n# The pipeline may be a classic (designer) pipeline without YAML.',
        }],
      };
    }

    // Step 2: Fetch the main pipeline YAML file
    const { versionType, version } = mainRepoRef
      ? parseRef(mainRepoRef)
      : { versionType: undefined, version: undefined };

    const mainContent = await fetchFile(
      connection,
      projectId,
      mainRepoId,
      yamlPath,
      versionType,
      version,
    );

    const files: PipelineYamlFile[] = [{
      label: `${yamlPath} (self${mainRepoRef ? '@' + mainRepoRef : ''})`,
      repositoryAlias: 'self',
      repositoryName: mainRepoId,
      ref: mainRepoRef,
      path: yamlPath,
      content: mainContent,
    }];

    // Step 3: Parse resources from the main YAML
    const resources = parseResources(mainContent);

    // Step 4: Recursively resolve templates
    const visited = new Set<string>();
    const queue: Array<{
      content: string;
      basePath: string;
      repoAlias: string | null;
    }> = [{ content: mainContent, basePath: yamlPath, repoAlias: null }];

    while (queue.length > 0) {
      const { content, basePath, repoAlias } = queue.shift()!;
      const templateRefs = extractTemplateRefs(content);

      for (const ref of templateRefs) {
        // Resolve which repo to fetch from
        const targetAlias = ref.repoAlias ?? repoAlias;
        let targetRepoId: string;
        let targetRef: string;
        let targetProjectId = projectId;
        let targetLabel: string;

        if (targetAlias && resources.has(targetAlias)) {
          const repo = resources.get(targetAlias)!;
          // Parse "Project/RepoName" to determine cross-project repos
          if (repo.name.includes('/')) {
            const [projName, repoName] = repo.name.split('/');
            targetProjectId = projName;
            targetRepoId = repoName;
          } else {
            targetRepoId = repo.name;
          }
          targetRef = repo.ref || 'main';
          targetLabel = `${targetAlias}@${targetRef}`;
        } else if (targetAlias) {
          // Alias not found in resources — skip
          continue;
        } else {
          // Same repo as the current file
          if (repoAlias && resources.has(repoAlias)) {
            const repo = resources.get(repoAlias)!;
            if (repo.name.includes('/')) {
              const [projName, repoName] = repo.name.split('/');
              targetProjectId = projName;
              targetRepoId = repoName;
            } else {
              targetRepoId = repo.name;
            }
            targetRef = repo.ref || 'main';
          } else {
            targetRepoId = mainRepoId;
            targetRef = mainRepoRef;
          }
          targetLabel = `self${targetRef ? '@' + targetRef : ''}`;
        }

        // Resolve the template path
        const resolvedFilePath = resolvePath(basePath, ref.path, !!ref.repoAlias);
        const visitKey = `${resolvedFilePath}@${targetProjectId}/${targetRepoId}:${targetRef}`;

        if (visited.has(visitKey)) {
          continue;
        }
        visited.add(visitKey);

        // Fetch the template file
        const { versionType: vType, version: vStr } = parseRef(targetRef);
        try {
          const templateContent = await fetchFile(
            connection,
            targetProjectId,
            targetRepoId,
            resolvedFilePath,
            vType,
            vStr,
          );

          files.push({
            label: `${resolvedFilePath} (${targetLabel})`,
            repositoryAlias: targetAlias ?? 'self',
            repositoryName: targetRepoId,
            ref: targetRef,
            path: resolvedFilePath,
            content: templateContent,
          });

          // Queue this template for further resolution
          queue.push({
            content: templateContent,
            basePath: resolvedFilePath,
            repoAlias: targetAlias,
          });
        } catch {
          // Template file not found or inaccessible — skip but continue
        }
      }
    }

    return {
      runId,
      pipelineId: resolvedPipelineId,
      pipelinePath: yamlPath,
      files,
    };
  } catch (error) {
    if (error instanceof AzureDevOpsError) {
      throw error;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('authentication') || message.includes('unauthorized') || message.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
      if (message.includes('not found') || message.includes('does not exist') || message.includes('404')) {
        throw new AzureDevOpsResourceNotFoundError(`Pipeline run YAML not found: ${error.message}`);
      }
    }

    throw new AzureDevOpsError(
      `Failed to get pipeline run YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
