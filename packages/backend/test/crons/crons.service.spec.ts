jest.mock('@langchain/langgraph-sdk', () => ({ Client: jest.fn() }));

import { CronsService } from '../../src/crons/crons.service';

describe('CronsService', () => {
  let service: CronsService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      crons: {
        create: jest.fn(),
        createForThread: jest.fn(),
        search: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new CronsService(mockClient);
  });

  it('should create a cron job', async () => {
    const mockCron = { cron_id: 'cron-1' };
    mockClient.crons.create.mockResolvedValue(mockCron);

    const result = await service.create('agent', { schedule: '0 * * * *' });
    expect(result).toEqual(mockCron);
    expect(mockClient.crons.create).toHaveBeenCalledWith('agent', {
      schedule: '0 * * * *',
    });
  });

  it('should create a cron job for a thread', async () => {
    const mockCron = { cron_id: 'cron-2' };
    mockClient.crons.createForThread.mockResolvedValue(mockCron);

    const result = await service.createForThread('tid', 'agent', { schedule: '*/5 * * * *' });
    expect(result).toEqual(mockCron);
    expect(mockClient.crons.createForThread).toHaveBeenCalledWith('tid', 'agent', {
      schedule: '*/5 * * * *',
    });
  });

  it('should search cron jobs', async () => {
    const mockCrons = [{ cron_id: 'cron-1' }];
    mockClient.crons.search.mockResolvedValue(mockCrons);

    const result = await service.search({ limit: 10 });
    expect(result).toEqual(mockCrons);
    expect(mockClient.crons.search).toHaveBeenCalledWith({ limit: 10 });
  });

  it('should delete a cron job', async () => {
    mockClient.crons.delete.mockResolvedValue(undefined);

    await service.delete('cron-1');
    expect(mockClient.crons.delete).toHaveBeenCalledWith('cron-1');
  });
});
