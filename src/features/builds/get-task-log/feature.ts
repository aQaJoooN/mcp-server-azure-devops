import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';

export async function getTaskLog(
  connection: WebApi,
  projectId: string,
  buildId: number,
  logId: number,
  startLine?: number,
  endLine?: number,
): Promise<string> {
  try {
    const buildApi = await connection.getBuildApi();
    const lines = await buildApi.getBuildLogLines(
      projectId,
      buildId,
      logId,
      startLine,
      endLine,
    );

    if (!lines) {
      throw new AzureDevOpsResourceNotFoundError(
        `Log ${logId} not found for build ${buildId} in project ${projectId}`,
      );
    }

    return lines.join('\n');
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
      if (
        msg.includes('not found') ||
        msg.includes('does not exist') ||
        msg.includes('404')
      ) {
        throw new AzureDevOpsResourceNotFoundError(
          `Log ${logId} not found for build ${buildId}: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get task log: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
