import { WebApi } from 'azure-devops-node-api';
import { getAgentImageVersion } from './feature';

jest.mock('../get-agent-details/feature');
import { getAgentDetails } from '../get-agent-details/feature';

describe('getAgentImageVersion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('extracts imageVersion and containerImage from capabilities', async () => {
    (getAgentDetails as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'k8s-agent',
      version: '3.0',
      systemCapabilities: {
        ImageVersion: '20240601.1',
        ContainerImage: 'my-registry/agent:latest',
        JAVA_HOME: '/usr/lib/jvm',
        NODE_VERSION: '20',
      },
      userCapabilities: {},
    });
    const result = await getAgentImageVersion({} as WebApi, 1, 1);
    expect(result.agentVersion).toBe('3.0');
    expect(result.imageVersion).toBe('20240601.1');
    expect(result.containerImage).toBe('my-registry/agent:latest');
    expect(result.rawCapabilities).toHaveProperty('ImageVersion');
    expect(result.rawCapabilities).toHaveProperty('ContainerImage');
    // Non-image keys should be excluded from rawCapabilities
    expect(result.rawCapabilities).not.toHaveProperty('JAVA_HOME');
  });

  it('returns null for imageVersion and containerImage when not present', async () => {
    (getAgentDetails as jest.Mock).mockResolvedValue({
      id: 2,
      name: 'plain-agent',
      version: '2.0',
      systemCapabilities: { JAVA_HOME: '/usr/lib/jvm' },
      userCapabilities: {},
    });
    const result = await getAgentImageVersion({} as WebApi, 1, 2);
    expect(result.imageVersion).toBeNull();
    expect(result.containerImage).toBeNull();
    expect(result.rawCapabilities).toEqual({});
  });
});
