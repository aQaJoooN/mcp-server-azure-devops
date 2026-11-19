import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { BuildSummary, BuildChange } from '../types';
import { getBuildDetails } from '../get-build-details/feature';
import { getLastSuccessfulBuild } from '../get-last-successful-build/feature';
import { getBuildChanges } from '../get-build-changes/feature';

export interface CompareFailedSuccessfulResult {
  failedBuild: BuildSummary;
  lastSuccessfulBuild: BuildSummary | null;
  differences: { field: string; failed: unknown; successful: unknown }[];
  changesInFailedBuild: BuildChange[];
}

const COMPARE_FIELDS = [
  'status',
  'result',
  'sourceBranch',
  'sourceVersion',
  'startTime',
  'finishTime',
  'buildNumber',
] as const;

export async function compareFailedSuccessfulBuilds(
  connection: WebApi,
  projectId: string,
  failedBuildId: number,
  definitionId?: number,
  branchName?: string,
): Promise<CompareFailedSuccessfulResult> {
  try {
    const failedBuild = await getBuildDetails(connection, projectId, failedBuildId);

    const resolvedDefinitionId = definitionId ?? failedBuild.definition?.id;
    if (!resolvedDefinitionId) {
      throw new AzureDevOpsResourceNotFoundError(
        `Could not determine definition ID for build ${failedBuildId}`,
      );
    }

    const resolvedBranch = branchName ?? failedBuild.sourceBranch;

    const [lastSuccessful, changesInFailedBuild] = await Promise.all([
      getLastSuccessfulBuild(connection, projectId, resolvedDefinitionId, resolvedBranch),
      getBuildChanges(connection, projectId, failedBuildId),
    ]);

    const differences: { field: string; failed: unknown; successful: unknown }[] = [];
    if (lastSuccessful) {
      for (const field of COMPARE_FIELDS) {
        const vFailed = failedBuild[field];
        const vSuccess = lastSuccessful[field];
        if (vFailed !== vSuccess) {
          differences.push({ field, failed: vFailed, successful: vSuccess });
        }
      }
    }

    return {
      failedBuild,
      lastSuccessfulBuild: lastSuccessful,
      differences,
      changesInFailedBuild,
    };
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
    }
    throw new AzureDevOpsError(
      `Failed to compare builds: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
