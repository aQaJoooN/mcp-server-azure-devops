import { WebApi } from 'azure-devops-node-api';
import { getAgentEnvironmentSummary } from './feature';

jest.mock('../get-agent-details/feature');
import { getAgentDetails } from '../get-agent-details/feature';

describe('getAgentEnvironmentSummary', () => {
  it('filters out secret capabilities', async () => {
    (getAgentDetails as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Agent1',
      status: 'online',
      version: '3.0',
      systemCapabilities: {
        NODE_VERSION: '20',
        MY_SECRET_TOKEN: 'supersecret',
        JAVA_HOME: '/usr/lib/jvm/java',
        API_KEY: 'abc123',
        PASSWORD_HASH: 'xyz',
      },
      userCapabilities: { build_password: 'hidden', workspace: '/home/agent' },
    });
    const conn = {} as WebApi;
    const result = await getAgentEnvironmentSummary(conn, 1, 1);
    expect(result.systemCapabilities).toHaveProperty('NODE_VERSION');
    expect(result.systemCapabilities).toHaveProperty('JAVA_HOME');
    expect(result.systemCapabilities).not.toHaveProperty('MY_SECRET_TOKEN');
    expect(result.systemCapabilities).not.toHaveProperty('API_KEY');
    expect(result.systemCapabilities).not.toHaveProperty('PASSWORD_HASH');
    expect(result.userCapabilities).not.toHaveProperty('build_password');
    expect(result.userCapabilities).toHaveProperty('workspace');
  });
});
