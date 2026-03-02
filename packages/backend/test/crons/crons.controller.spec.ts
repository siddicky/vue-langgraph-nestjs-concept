jest.mock('@langchain/langgraph-sdk', () => ({ Client: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { CronsController } from '../../src/crons/crons.controller';
import { CronsService } from '../../src/crons/crons.service';

describe('CronsController', () => {
  let controller: CronsController;
  let service: jest.Mocked<CronsService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      createForThread: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CronsController],
      providers: [{ provide: CronsService, useValue: mockService }],
    }).compile();

    controller = module.get<CronsController>(CronsController);
    service = module.get(CronsService);
  });

  it('should create a cron job', async () => {
    service.create.mockResolvedValue({ cron_id: 'cron-1' } as any);

    const result = await controller.create({
      assistant_id: 'agent',
      schedule: '0 * * * *',
    });
    expect(result).toEqual({ cron_id: 'cron-1' });
    expect(service.create).toHaveBeenCalledWith('agent', {
      schedule: '0 * * * *',
      input: undefined,
      metadata: undefined,
      config: undefined,
    });
  });

  it('should create a cron for a thread', async () => {
    service.createForThread.mockResolvedValue({ cron_id: 'cron-2' } as any);

    const result = await controller.createForThread('tid', {
      assistant_id: 'agent',
      schedule: '*/5 * * * *',
    });
    expect(result).toEqual({ cron_id: 'cron-2' });
    expect(service.createForThread).toHaveBeenCalledWith('tid', 'agent', {
      schedule: '*/5 * * * *',
      input: undefined,
      metadata: undefined,
      config: undefined,
    });
  });

  it('should search cron jobs', async () => {
    service.search.mockResolvedValue([{ cron_id: 'cron-1' }] as any);

    const result = await controller.search({ limit: 10 });
    expect(result).toEqual([{ cron_id: 'cron-1' }]);
  });

  it('should delete a cron job', async () => {
    service.delete.mockResolvedValue(undefined);

    await controller.delete('cron-1');
    expect(service.delete).toHaveBeenCalledWith('cron-1');
  });
});
