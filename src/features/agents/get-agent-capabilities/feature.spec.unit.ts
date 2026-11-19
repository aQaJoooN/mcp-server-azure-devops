import { WebApi } from 'azure-devops-node-api';
import {
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsError,
} from '../../../shared/errors';
import { getAgentCapabilities } from './feature';

jest.mock('../get-agent-details/feature');
import { getAgentDetails } from '../get-agent-details/feature';

describe('getAgentCapabilities', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns split capabilities', async () => {
    (getAgentDetails as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Agent1',
      systemCapabilities: { JAVA_HOME: '/usr', NODE_VERSION: '20' },
      userCapabilities: { build_env: 'production' },
    });
    const result = await getAgentCapabilities({} as WebApi, 1, 1);
    expect(result.agentId).toBe(1);
    expect(result.agentName).toBe('Agent1');
    expect(result.systemCapabilities).toEqual({
      JAVA_HOME: '/usr',
      NODE_VERSION: '20',
    });
    expect(result.userCapabilities).toEqual({ build_env: 'production' });
  });

  it('returns empty objects when no capabilities', async () => {
    (getAgentDetails as jest.Mock).mockResolvedValue({
      id: 2,
      name: 'Agent2',
    });
    const result = await getAgentCapabilities({} as WebApi, 1, 2);
    expect(result.systemCapabilities).toEqual({});
    expect(result.userCapabilities).toEqual({});
  });

  it('propagates errors from getAgentDetails', async () => {
    (getAgentDetails as jest.Mock).mockRejectedValue(
      new AzureDevOpsResourceNotFoundError('agent not found'),
    );
    await expect(
      getAgentCapabilities({} as WebApi, 1, 99),
    ).rejects.toBeInstanceOf(AzureDevOpsResourceNotFoundError);
  });
});
