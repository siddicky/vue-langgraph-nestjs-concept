jest.mock('@langchain/langgraph-sdk', () => ({ Client: jest.fn() }));

import { ThreadService } from '../../src/thread/thread.service';

describe('ThreadService', () => {
  let service: ThreadService;

  beforeEach(() => {
    const mockConfig = { get: jest.fn().mockReturnValue('local') } as any;
    service = new ThreadService(mockConfig);
  });

  describe('generateThreadId', () => {
    it('should return a valid UUID v4 string', () => {
      const id = service.generateThreadId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should generate unique thread IDs', () => {
      const ids = new Set(
        Array.from({ length: 100 }, () => service.generateThreadId()),
      );
      expect(ids.size).toBe(100);
    });
  });

  describe('getCheckpointer', () => {
    it('should return a checkpointer instance', () => {
      const checkpointer = service.getCheckpointer();
      expect(checkpointer).toBeDefined();
    });

    it('should return the same checkpointer on multiple calls', () => {
      const cp1 = service.getCheckpointer();
      const cp2 = service.getCheckpointer();
      expect(cp1).toBe(cp2);
    });
  });

  describe('remote methods in local mode', () => {
    it('should throw when calling getThread in local mode', async () => {
      await expect(service.getThread('tid')).rejects.toThrow(
        'getThread() is only available in remote mode',
      );
    });

    it('should throw when calling deleteThread in local mode', async () => {
      await expect(service.deleteThread('tid')).rejects.toThrow(
        'deleteThread() is only available in remote mode',
      );
    });

    it('should throw when calling searchThreads in local mode', async () => {
      await expect(service.searchThreads()).rejects.toThrow(
        'searchThreads() is only available in remote mode',
      );
    });

    it('should throw when calling copyThread in local mode', async () => {
      await expect(service.copyThread('tid')).rejects.toThrow(
        'copyThread() is only available in remote mode',
      );
    });
  });

  describe('remote methods in remote mode', () => {
    let remoteService: ThreadService;
    let mockClient: any;

    beforeEach(() => {
      const mockConfig = { get: jest.fn().mockReturnValue('remote') } as any;
      mockClient = {
        threads: {
          get: jest.fn().mockResolvedValue({ thread_id: 'tid' }),
          delete: jest.fn().mockResolvedValue(undefined),
          search: jest.fn().mockResolvedValue([]),
          copy: jest.fn().mockResolvedValue({ thread_id: 'tid-copy' }),
        },
      };
      remoteService = new ThreadService(mockConfig, mockClient);
    });

    it('should delegate getThread to client', async () => {
      const result = await remoteService.getThread('tid');
      expect(result).toEqual({ thread_id: 'tid' });
      expect(mockClient.threads.get).toHaveBeenCalledWith('tid');
    });

    it('should delegate deleteThread to client', async () => {
      await remoteService.deleteThread('tid');
      expect(mockClient.threads.delete).toHaveBeenCalledWith('tid');
    });

    it('should delegate searchThreads to client', async () => {
      await remoteService.searchThreads({ limit: 5 });
      expect(mockClient.threads.search).toHaveBeenCalledWith({ limit: 5 });
    });

    it('should delegate copyThread to client', async () => {
      const result = await remoteService.copyThread('tid');
      expect(result).toEqual({ thread_id: 'tid-copy' });
      expect(mockClient.threads.copy).toHaveBeenCalledWith('tid');
    });
  });
});
