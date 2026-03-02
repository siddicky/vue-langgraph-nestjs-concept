jest.mock('@langchain/langgraph-sdk', () => ({ Client: jest.fn() }));

import { StoreService } from '../../src/store/store.service';

describe('StoreService', () => {
  let service: StoreService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      store: {
        putItem: jest.fn(),
        getItem: jest.fn(),
        deleteItem: jest.fn(),
        searchItems: jest.fn(),
        listNamespaces: jest.fn(),
      },
    };

    service = new StoreService(mockClient);
  });

  it('should put an item', async () => {
    mockClient.store.putItem.mockResolvedValue(undefined);

    await service.putItem(['users', 'prefs'], 'theme', { dark: true });
    expect(mockClient.store.putItem).toHaveBeenCalledWith(
      ['users', 'prefs'],
      'theme',
      { dark: true },
      undefined,
    );
  });

  it('should put an item with options', async () => {
    mockClient.store.putItem.mockResolvedValue(undefined);

    await service.putItem(['ns'], 'k', { v: 1 }, { ttl: 3600 });
    expect(mockClient.store.putItem).toHaveBeenCalledWith(
      ['ns'],
      'k',
      { v: 1 },
      { ttl: 3600 },
    );
  });

  it('should get an item', async () => {
    const mockItem = { namespace: ['ns'], key: 'k', value: { v: 1 } };
    mockClient.store.getItem.mockResolvedValue(mockItem);

    const result = await service.getItem(['ns'], 'k');
    expect(result).toEqual(mockItem);
    expect(mockClient.store.getItem).toHaveBeenCalledWith(['ns'], 'k', undefined);
  });

  it('should delete an item', async () => {
    mockClient.store.deleteItem.mockResolvedValue(undefined);

    await service.deleteItem(['ns'], 'k');
    expect(mockClient.store.deleteItem).toHaveBeenCalledWith(['ns'], 'k');
  });

  it('should search items', async () => {
    const mockResults = { items: [{ key: 'k1' }] };
    mockClient.store.searchItems.mockResolvedValue(mockResults);

    const result = await service.searchItems(['ns'], { query: 'test', limit: 5 });
    expect(result).toEqual(mockResults);
    expect(mockClient.store.searchItems).toHaveBeenCalledWith(['ns'], {
      query: 'test',
      limit: 5,
    });
  });

  it('should list namespaces', async () => {
    const mockNamespaces = { namespaces: [['users'], ['prefs']] };
    mockClient.store.listNamespaces.mockResolvedValue(mockNamespaces);

    const result = await service.listNamespaces({ prefix: ['users'] });
    expect(result).toEqual(mockNamespaces);
    expect(mockClient.store.listNamespaces).toHaveBeenCalledWith({ prefix: ['users'] });
  });
});
