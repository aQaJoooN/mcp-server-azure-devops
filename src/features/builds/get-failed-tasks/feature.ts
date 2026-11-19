import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { BuildTimelineRecord } from '../types';
import { getBuildTimeline } from '../get-build-timeline/feature';

const FAILED_RESULTS = new Set(['failed', 'canceled', 'abandoned']);

function normalizeResult(result: string | number | undefined): string {
  if (typeof result === 'number') {
    // TaskResult enum: 0=succeeded, 1=succeededWithIssues, 2=failed, 3=canceled, 4=skipped, 5=abandoned
    const names: Record<number, string> = {
      0: 'succeeded',
      1: 'succeededwithissues',
      2: 'failed',
      3: 'canceled',
      4: 'skipped',
      5: 'abandoned',
    };
    return names[result] ?? String(result);
  }
  return typeof result === 'string' ? result.toLowerCase() : '';
}

export async function getFailedTasks(
  connection: WebApi,
  projectId: string,
  buildId: number,
): Promise<BuildTimelineRecord[]> {
  try {
    const timeline = await getBuildTimeline(connection, projectId, buildId);
    const records = (timeline.records ?? []) as BuildTimelineRecord[];

    return records.filter((r) => {
      const result = normalizeResult(r.result);
      return FAILED_RESULTS.has(result);
    });
  } catch (error) {
    if (error instanceof AzureDevOpsError) throw error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
        throw new AzureDevOpsAuthenticationError(`Failed to authenticate: ${error.message}`);
      }
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
        throw new AzureDevOpsResourceNotFoundError(
          `Build ${buildId} not found in project ${projectId}: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get failed tasks: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
