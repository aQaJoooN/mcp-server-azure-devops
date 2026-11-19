import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { apiVersion } from '../../../utils/environment';
import { BuildSummary } from '../types';

type BuildField = keyof BuildSummary;

const COMPARE_FIELDS: BuildField[] = [
  'status',
  'result',
  'sourceBranch',
  'sourceVersion',
  'startTime',
  'finishTime',
  'buildNumber',
];

async function fetchBuild(
  connection: WebApi,
  projectId: string,
  buildId: number,
): Promise<BuildSummary> {
  const buildApi = await connection.getBuildApi();
  const baseUrl = connection.serverUrl.replace(/\/+$/, '');
  const url = new URL(
    `${encodeURIComponent(projectId)}/_apis/build/builds/${buildId}`,
    `${baseUrl}/`,
  );
  url.searchParams.set('api-version', apiVersion);
  const requestOptions = buildApi.createRequestOptions(
    'application/json',
    apiVersion,
  );
  const response = await buildApi.rest.get<BuildSummary | null>(
    url.toString(),
    requestOptions,
  );
  if (response.statusCode === 404 || !response.result) {
    throw new AzureDevOpsResourceNotFoundError(
      `Build ${buildId} not found in project ${projectId}`,
    );
  }
  return response.result;
}

export interface CompareBuildsDiff {
  field: string;
  build1: unknown;
  build2: unknown;
}

export interface CompareBuildsResult {
  build1: BuildSummary;
  build2: BuildSummary;
  differences: CompareBuildsDiff[];
}

export async function compareBuilds(
  connection: WebApi,
  projectId: string,
  buildId1: number,
  buildId2: number,
): Promise<CompareBuildsResult> {
  try {
    const [build1, build2] = await Promise.all([
      fetchBuild(connection, projectId, buildId1),
      fetchBuild(connection, projectId, buildId2),
    ]);

    const differences: CompareBuildsDiff[] = [];
    for (const field of COMPARE_FIELDS) {
      const v1 = build1[field];
      const v2 = build2[field];
      if (v1 !== v2) {
        differences.push({ field, build1: v1, build2: v2 });
      }
    }
    // Compare definition id
    if (build1.definition?.id !== build2.definition?.id) {
      differences.push({
        field: 'definition.id',
        build1: build1.definition?.id,
        build2: build2.definition?.id,
      });
    }

    return { build1, build2, differences };
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('authentication') ||
        msg.includes('unauthorized') ||
        msg.includes('401')
      ) {
        throw new AzureDevOpsAuthenticationError(
          `Failed to authenticate: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to compare builds: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
