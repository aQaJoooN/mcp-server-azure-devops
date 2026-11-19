import { WebApi } from 'azure-devops-node-api';
import { getFailedTasks } from './feature';

jest.mock('../get-build-timeline/feature');
import { getBuildTimeline } from '../get-build-timeline/feature';

describe('getFailedTasks', () => {
  it('returns only failed and canceled records', async () => {
    (getBuildTimeline as jest.Mock).mockResolvedValue({
      records: [
        { name: 'Build', result: 'failed' },
        { name: 'Test', result: 'succeeded' },
        { name: 'Deploy', result: 'canceled' },
        { name: 'Skipped', result: 'skipped' },
        // numeric enum: 2=failed, 3=canceled, 0=succeeded
        { name: 'NumFailed', result: 2 },
        { name: 'NumSucceeded', result: 0 },
      ],
    });
    const result = await getFailedTasks({} as WebApi, 'proj', 42);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.name)).toEqual(
      expect.arrayContaining(['Build', 'Deploy', 'NumFailed']),
    );
  });

  it('returns empty array when no failures', async () => {
    (getBuildTimeline as jest.Mock).mockResolvedValue({
      records: [{ name: 'Build', result: 'succeeded' }],
    });
    const result = await getFailedTasks({} as WebApi, 'proj', 42);
    expect(result).toHaveLength(0);
  });
});
