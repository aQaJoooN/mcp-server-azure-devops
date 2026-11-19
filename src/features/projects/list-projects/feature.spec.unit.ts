import { WebApi } from 'azure-devops-node-api';
import { listProjects } from './feature';

function makeConn(projects: unknown) {
  const coreApi = { getProjects: jest.fn().mockResolvedValue(projects) };
  return {
    getCoreApi: jest.fn().mockResolvedValue(coreApi),
  } as unknown as WebApi;
}

describe('listProjects', () => {
  it('returns project list on success', async () => {
    const mockProjects = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
    ];
    const conn = makeConn(mockProjects);
    const result = await listProjects(conn);
    expect(result).toEqual(mockProjects);
  });

  it('passes options to coreApi.getProjects', async () => {
    const coreApi = { getProjects: jest.fn().mockResolvedValue([]) };
    const conn = {
      getCoreApi: jest.fn().mockResolvedValue(coreApi),
    } as unknown as WebApi;
    await listProjects(conn, { stateFilter: 1, top: 5, skip: 10 });
    expect(coreApi.getProjects).toHaveBeenCalledWith(1, 5, 10, undefined);
  });

  it('wraps errors in a plain Error', async () => {
    const coreApi = {
      getProjects: jest.fn().mockRejectedValue(new Error('server error')),
    };
    const conn = {
      getCoreApi: jest.fn().mockResolvedValue(coreApi),
    } as unknown as WebApi;
    await expect(listProjects(conn)).rejects.toThrow('Failed to list projects');
  });
});
