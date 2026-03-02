jest.mock('@langchain/langgraph-sdk', () => ({ Client: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { AssistantsController } from '../../src/assistants/assistants.controller';
import { AssistantsService } from '../../src/assistants/assistants.service';

describe('AssistantsController', () => {
  let controller: AssistantsController;
  let service: jest.Mocked<AssistantsService>;

  beforeEach(async () => {
    const mockService = {
      search: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getGraph: jest.fn(),
      getSchemas: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssistantsController],
      providers: [{ provide: AssistantsService, useValue: mockService }],
    }).compile();

    controller = module.get<AssistantsController>(AssistantsController);
    service = module.get(AssistantsService);
  });

  it('should search assistants', async () => {
    service.search.mockResolvedValue([{ assistant_id: 'a1' }] as any);

    const result = await controller.search({ graph_id: 'agent', limit: 10 });
    expect(result).toEqual([{ assistant_id: 'a1' }]);
    expect(service.search).toHaveBeenCalledWith({
      graphId: 'agent',
      metadata: undefined,
      limit: 10,
      offset: undefined,
    });
  });

  it('should get assistant by id', async () => {
    service.get.mockResolvedValue({ assistant_id: 'a1' } as any);

    const result = await controller.get('a1');
    expect(result).toEqual({ assistant_id: 'a1' });
  });

  it('should create assistant', async () => {
    service.create.mockResolvedValue({ assistant_id: 'a2' } as any);

    const result = await controller.create({ graph_id: 'agent', name: 'Test' });
    expect(result).toEqual({ assistant_id: 'a2' });
    expect(service.create).toHaveBeenCalledWith({
      graphId: 'agent',
      config: undefined,
      metadata: undefined,
      assistantId: undefined,
      name: 'Test',
      description: undefined,
    });
  });

  it('should update assistant', async () => {
    service.update.mockResolvedValue({ assistant_id: 'a1' } as any);

    const result = await controller.update('a1', { name: 'Updated' });
    expect(result).toEqual({ assistant_id: 'a1' });
  });

  it('should delete assistant', async () => {
    service.delete.mockResolvedValue(undefined);

    await controller.delete('a1');
    expect(service.delete).toHaveBeenCalledWith('a1');
  });

  it('should get graph', async () => {
    service.getGraph.mockResolvedValue({ nodes: [] } as any);

    const result = await controller.getGraph('a1', 'true');
    expect(result).toEqual({ nodes: [] });
    expect(service.getGraph).toHaveBeenCalledWith('a1', { xray: true });
  });

  it('should get schemas', async () => {
    service.getSchemas.mockResolvedValue({ input: {} } as any);

    const result = await controller.getSchemas('a1');
    expect(result).toEqual({ input: {} });
  });
});
