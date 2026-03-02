jest.mock('@langchain/langgraph-sdk', () => ({ Client: jest.fn() }));

import { AssistantsService } from '../../src/assistants/assistants.service';

describe('AssistantsService', () => {
  let service: AssistantsService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      assistants: {
        search: jest.fn(),
        get: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        getGraph: jest.fn(),
        getSchemas: jest.fn(),
      },
    };

    service = new AssistantsService(mockClient);
  });

  it('should search assistants', async () => {
    const mockResults = [{ assistant_id: 'a1', name: 'Agent' }];
    mockClient.assistants.search.mockResolvedValue(mockResults);

    const result = await service.search({ limit: 5 });
    expect(result).toEqual(mockResults);
    expect(mockClient.assistants.search).toHaveBeenCalledWith({ limit: 5 });
  });

  it('should get assistant by id', async () => {
    const mockAssistant = { assistant_id: 'a1', name: 'Agent' };
    mockClient.assistants.get.mockResolvedValue(mockAssistant);

    const result = await service.get('a1');
    expect(result).toEqual(mockAssistant);
    expect(mockClient.assistants.get).toHaveBeenCalledWith('a1');
  });

  it('should create assistant', async () => {
    const mockAssistant = { assistant_id: 'a2', name: 'New' };
    mockClient.assistants.create.mockResolvedValue(mockAssistant);

    const result = await service.create({ graphId: 'agent', name: 'New' });
    expect(result).toEqual(mockAssistant);
    expect(mockClient.assistants.create).toHaveBeenCalledWith({
      graphId: 'agent',
      name: 'New',
    });
  });

  it('should update assistant', async () => {
    const mockAssistant = { assistant_id: 'a1', name: 'Updated' };
    mockClient.assistants.update.mockResolvedValue(mockAssistant);

    const result = await service.update('a1', { name: 'Updated' });
    expect(result).toEqual(mockAssistant);
    expect(mockClient.assistants.update).toHaveBeenCalledWith('a1', { name: 'Updated' });
  });

  it('should delete assistant', async () => {
    mockClient.assistants.delete.mockResolvedValue(undefined);

    await service.delete('a1');
    expect(mockClient.assistants.delete).toHaveBeenCalledWith('a1');
  });

  it('should get graph for assistant', async () => {
    const mockGraph = { nodes: [], edges: [] };
    mockClient.assistants.getGraph.mockResolvedValue(mockGraph);

    const result = await service.getGraph('a1', { xray: true });
    expect(result).toEqual(mockGraph);
    expect(mockClient.assistants.getGraph).toHaveBeenCalledWith('a1', { xray: true });
  });

  it('should get schemas for assistant', async () => {
    const mockSchemas = { input: {}, output: {} };
    mockClient.assistants.getSchemas.mockResolvedValue(mockSchemas);

    const result = await service.getSchemas('a1');
    expect(result).toEqual(mockSchemas);
    expect(mockClient.assistants.getSchemas).toHaveBeenCalledWith('a1');
  });
});
