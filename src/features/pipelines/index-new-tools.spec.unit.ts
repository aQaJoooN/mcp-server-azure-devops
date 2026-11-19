/**
 * Tests for the 6 new pipeline tools added in the build investigation implementation.
 */
import { WebApi } from 'azure-devops-node-api';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { isPipelinesRequest, handlePipelinesRequest } from './index';
import { getPipelineDefinition } from './get-pipeline-definition/feature';
import { getPipelineYaml } from './get-pipeline-yaml/feature';
import { getPipelineTemplate } from './get-pipeline-template/feature';
import { getVariableGroups } from './get-variable-groups/feature';
import { getPipelineResources } from './get-pipeline-resources/feature';
import { getAgentPoolDetails } from './get-agent-pool-details/feature';

jest.mock('./get-pipeline-definition/feature');
jest.mock('./get-pipeline-yaml/feature');
jest.mock('./get-pipeline-template/feature');
jest.mock('./get-variable-groups/feature');
jest.mock('./get-pipeline-resources/feature');
jest.mock('./get-agent-pool-details/feature');

const mockConnection = {} as WebApi;

function makeRequest(
  name: string,
  args: Record<string, unknown> = {},
): CallToolRequest {
  return {
    params: { name, arguments: args },
    method: 'tools/call',
  } as CallToolRequest;
}

describe('isPipelinesRequest — new tools', () => {
  it('returns true for all new pipeline tool names', () => {
    const tools = [
      'get_pipeline_definition',
      'get_pipeline_yaml',
      'get_pipeline_template',
      'get_variable_groups',
      'get_pipeline_resources',
      'get_agent_pool_details',
    ];
    for (const tool of tools) {
      expect(isPipelinesRequest(makeRequest(tool))).toBe(true);
    }
  });
});

describe('handlePipelinesRequest — new tools', () => {
  beforeEach(() => jest.clearAllMocks());

  it('handles get_pipeline_definition', async () => {
    const def = { id: 1, name: 'CI' };
    (getPipelineDefinition as jest.Mock).mockResolvedValue(def);
    const res = await handlePipelinesRequest(
      mockConnection,
      makeRequest('get_pipeline_definition', {
        projectId: 'proj',
        definitionId: 1,
      }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(def);
    expect(getPipelineDefinition).toHaveBeenCalledWith(
      mockConnection,
      'proj',
      1,
      undefined,
    );
  });

  it('handles get_pipeline_yaml — returns plain content', async () => {
    (getPipelineYaml as jest.Mock).mockResolvedValue({
      definitionId: 1,
      content: 'trigger: main\n',
    });
    const res = await handlePipelinesRequest(
      mockConnection,
      makeRequest('get_pipeline_yaml', { projectId: 'proj', definitionId: 1 }),
    );
    expect(res.content[0].text).toBe('trigger: main\n');
  });

  it('handles get_pipeline_yaml — returns JSON when no content', async () => {
    (getPipelineYaml as jest.Mock).mockResolvedValue({
      definitionId: 2,
      error: 'No YAML',
    });
    const res = await handlePipelinesRequest(
      mockConnection,
      makeRequest('get_pipeline_yaml', { projectId: 'proj', definitionId: 2 }),
    );
    expect(JSON.parse(res.content[0].text).error).toBe('No YAML');
  });

  it('handles get_pipeline_template — returns plain content', async () => {
    (getPipelineTemplate as jest.Mock).mockResolvedValue({
      repositoryId: 'repo',
      templatePath: 't.yml',
      branchName: 'main',
      content: '# template\n',
    });
    const res = await handlePipelinesRequest(
      mockConnection,
      makeRequest('get_pipeline_template', {
        projectId: 'proj',
        repositoryId: 'repo',
        templatePath: 't.yml',
      }),
    );
    expect(res.content[0].text).toBe('# template\n');
  });

  it('handles get_variable_groups', async () => {
    const groups = [
      { id: 1, name: 'SharedVars', variables: { MY_VAR: { value: 'x' } } },
    ];
    (getVariableGroups as jest.Mock).mockResolvedValue(groups);
    const res = await handlePipelinesRequest(
      mockConnection,
      makeRequest('get_variable_groups', { projectId: 'proj' }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(groups);
  });

  it('handles get_pipeline_resources', async () => {
    const resources = {
      definitionId: 1,
      name: 'CI',
      primaryRepository: { name: 'MyRepo' },
    };
    (getPipelineResources as jest.Mock).mockResolvedValue(resources);
    const res = await handlePipelinesRequest(
      mockConnection,
      makeRequest('get_pipeline_resources', {
        projectId: 'proj',
        definitionId: 1,
      }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(resources);
  });

  it('handles get_agent_pool_details', async () => {
    const poolDetails = {
      definitionId: 1,
      queue: { id: 5, name: 'Default' },
      pool: { id: 5 },
    };
    (getAgentPoolDetails as jest.Mock).mockResolvedValue(poolDetails);
    const res = await handlePipelinesRequest(
      mockConnection,
      makeRequest('get_agent_pool_details', {
        projectId: 'proj',
        definitionId: 1,
      }),
    );
    expect(JSON.parse(res.content[0].text)).toEqual(poolDetails);
  });
});
