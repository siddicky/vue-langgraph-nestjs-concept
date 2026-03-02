jest.mock('@langchain/langgraph-sdk', () => ({ Client: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { StoreController } from '../../src/store/store.controller';
import { StoreService } from '../../src/store/store.service';

describe('StoreController', () => {
  let controller: StoreController;
  let service: jest.Mocked<StoreService>;

  beforeEach(async () => {
    const mockService = {
      putItem: jest.fn(),
      getItem: jest.fn(),
      deleteItem: jest.fn(),
      searchItems: jest.fn(),
      listNamespaces: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [{ provide: StoreService, useValue: mockService }],
    }).compile();

    controller = module.get<StoreController>(StoreController);
    service = module.get(StoreService);
  });

  it('should put an item', async () => {
    service.putItem.mockResolvedValue(undefined);

    await controller.putItem({
      namespace: ['users'],
      key: 'theme',
      value: { dark: true },
    });
    expect(service.putItem).toHaveBeenCalledWith(
      ['users'],
      'theme',
      { dark: true },
      { index: undefined, ttl: undefined },
    );
  });

  it('should get an item', async () => {
    const mockItem = { key: 'k', value: { v: 1 } };
    service.getItem.mockResolvedValue(mockItem as any);

    const result = await controller.getItem({
      namespace: ['ns'],
      key: 'k',
    });
    expect(result).toEqual(mockItem);
  });

  it('should delete an item', async () => {
    service.deleteItem.mockResolvedValue(undefined);

    await controller.deleteItem({ namespace: ['ns'], key: 'k' });
    expect(service.deleteItem).toHaveBeenCalledWith(['ns'], 'k');
  });

  it('should search items', async () => {
    const mockResults = { items: [] };
    service.searchItems.mockResolvedValue(mockResults as any);

    const result = await controller.searchItems({
      namespace_prefix: ['ns'],
      query: 'test',
      limit: 10,
    });
    expect(result).toEqual(mockResults);
    expect(service.searchItems).toHaveBeenCalledWith(['ns'], {
      filter: undefined,
      limit: 10,
      offset: undefined,
      query: 'test',
    });
  });

  it('should list namespaces', async () => {
    const mockNamespaces = { namespaces: [] };
    service.listNamespaces.mockResolvedValue(mockNamespaces as any);

    const result = await controller.listNamespaces({ prefix: ['ns'] });
    expect(result).toEqual(mockNamespaces);
  });
});
