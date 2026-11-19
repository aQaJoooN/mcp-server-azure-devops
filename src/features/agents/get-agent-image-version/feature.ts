import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsAuthenticationError,
  AzureDevOpsError,
  AzureDevOpsResourceNotFoundError,
} from '../../../shared/errors';
import { getAgentDetails } from '../get-agent-details/feature';

export interface AgentImageVersionResult {
  agentId: number;
  agentName?: string;
  agentVersion?: string;
  imageVersion: string | null;
  containerImage: string | null;
  rawCapabilities: Record<string, string>;
}

const IMAGE_KEYWORDS = [
  'image',
  'version',
  'docker',
  'container',
  'k8s',
  'kubernetes',
];

function matchesImageKeyword(key: string): boolean {
  const lower = key.toLowerCase();
  return IMAGE_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function getAgentImageVersion(
  connection: WebApi,
  poolId: number,
  agentId: number,
): Promise<AgentImageVersionResult> {
  try {
    const agent = await getAgentDetails(connection, poolId, agentId, true);
    const all: Record<string, string> = {
      ...(agent.systemCapabilities ?? {}),
      ...(agent.userCapabilities ?? {}),
    };

    // Filter to image/version-related capabilities
    const rawCapabilities: Record<string, string> = {};
    for (const [key, value] of Object.entries(all)) {
      if (matchesImageKeyword(key)) {
        rawCapabilities[key] = value;
      }
    }

    // Try to find container image and image version
    const findValue = (keywords: string[]): string | null => {
      for (const [key, value] of Object.entries(all)) {
        const lower = key.toLowerCase();
        if (keywords.some((kw) => lower.includes(kw)) && value) {
          return value;
        }
      }
      return null;
    };

    const containerImage = findValue([
      'containerimage',
      'dockerimage',
      'k8simage',
      'kubernetesimage',
      'docker_image',
      'container_image',
    ]);
    const imageVersion = findValue([
      'imageversion',
      'image_version',
      'agentimageversion',
    ]);

    return {
      agentId: agent.id,
      agentName: agent.name,
      agentVersion: agent.version,
      imageVersion,
      containerImage,
      rawCapabilities,
    };
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
          `Agent ${agentId} not found in pool ${poolId}: ${error.message}`,
        );
      }
    }
    throw new AzureDevOpsError(
      `Failed to get agent image version: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
