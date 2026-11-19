import { WebApi } from 'azure-devops-node-api';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { isAgentsRequest, handleAgentsRequest } from './index';
import { getAgentDetails } from './get-agent-details/feature';
import { getAgentCapabilities } from './get-agent-capabilities/feature';
import { getAgentJobHistory } from './get-agent-job-history/feature';
import { getAgentPoolStatus } from './get-agent-pool-status/feature';
import { getAgentImageVersion } from './get-agent-image-version/feature';
import { getAgentEnvironmentSummary } from './get-agent-environment-summary/feature';

jest.mock('./get-agent-details/feature');
jest.mock('./get-agent-capabilities/feature');
jest.mock('./get-agent-job-history/feature');
jest.mock('./get-agent-pool-status/feature');
jest.mock('./get-agent-image-version/feature');
jest.mock('./get-agent-environment-summary/feature');

const mockConnection = {} as WebApi;

function makeRequest(name: string, args: Record<string, unknown> = {}): CallToolRequest {
  return {
    params: { name, arguments: args },
    method: 'tools/call',
  } as CallToolRequest;
}

describe('isAgentsRequest', () => {
  it('returns true for all agent tool names', () => {
    const tools = [
      'get_agent_details',
      'get_agent_capabilities',
      'get_agent_job_history',
      'get_agent_pool_status',
      'get_agent_image_version',
      'get_agent_environment_summary',
    ];
    for (const tool of tools) {
      expect(isAgentsRequest(makeRequest(tool))).toBe(true);
    }
  });

  it('returns false for unrelated tool names', () => {
    expect(isAgentsRequest(makeRequest('list_pipelines'))).toBe(false);
    expect(isAgentsRequest(makeRequest('get_build_details'))).toBe(false);
  });
});

describe('handleAgentsRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('handles get_agent_details', async () => {
    const mockAgent = { id: 1, name: 'Agent 1', status: 'online' };
    (getAgentDetails as jest.Mock).mockResolvedValue(mockAgent);
    const res = await handleAgentsRequest(
      mockConnection,
      makeRequest('get_agent_details', { poolId: 1, agentId: 1 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockAgent);
    expect(getAgentDetails).toHaveBeenCalledWith(mockConnection, 1, 1, false);
  });

  it('handles get_agent_capabilities', async () => {
    const mockCaps = {
      agentId: 1,
      systemCapabilities: { Agent_Version: '3.0' },
      userCapabilities: {},
    };
    (getAgentCapabilities as jest.Mock).mockResolvedValue(mockCaps);
    const res = await handleAgentsRequest(
      mockConnection,
      makeRequest('get_agent_capabilities', { poolId: 1, agentId: 1 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockCaps);
  });

  it('handles get_agent_job_history', async () => {
    const mockJobs = [{ requestId: 100, result: 'succeeded' }];
    (getAgentJobHistory as jest.Mock).mockResolvedValue(mockJobs);
    const res = await handleAgentsRequest(
      mockConnection,
      makeRequest('get_agent_job_history', { poolId: 1, agentId: 1, top: 10 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockJobs);
    expect(getAgentJobHistory).toHaveBeenCalledWith(mockConnection, 1, 1, 10);
  });

  it('handles get_agent_pool_status', async () => {
    const mockStatus = {
      pool: { id: 1, name: 'Default' },
      agents: [],
      summary: { total: 0, online: 0, offline: 0, enabled: 0, disabled: 0 },
    };
    (getAgentPoolStatus as jest.Mock).mockResolvedValue(mockStatus);
    const res = await handleAgentsRequest(
      mockConnection,
      makeRequest('get_agent_pool_status', { poolId: 1 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockStatus);
  });

  it('handles get_agent_image_version', async () => {
    const mockImageInfo = {
      agentId: 1,
      agentName: 'Agent 1',
      agentVersion: '3.0',
      imageVersion: '20240101',
      containerImage: null,
      rawCapabilities: {},
    };
    (getAgentImageVersion as jest.Mock).mockResolvedValue(mockImageInfo);
    const res = await handleAgentsRequest(
      mockConnection,
      makeRequest('get_agent_image_version', { poolId: 1, agentId: 1 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockImageInfo);
  });

  it('handles get_agent_environment_summary', async () => {
    const mockSummary = {
      agentId: 1,
      agentName: 'Agent 1',
      status: 'online',
      version: '3.0',
      systemCapabilities: {},
      userCapabilities: {},
    };
    (getAgentEnvironmentSummary as jest.Mock).mockResolvedValue(mockSummary);
    const res = await handleAgentsRequest(
      mockConnection,
      makeRequest('get_agent_environment_summary', { poolId: 1, agentId: 1 }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(mockSummary);
  });

  it('throws for unknown tool names', async () => {
    await expect(
      handleAgentsRequest(mockConnection, makeRequest('nonexistent_tool')),
    ).rejects.toThrow('Unknown agents tool');
  });
});
