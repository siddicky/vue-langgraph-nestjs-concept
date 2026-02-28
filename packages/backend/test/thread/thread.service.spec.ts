import { ThreadService } from '../../src/thread/thread.service';

describe('ThreadService', () => {
  let service: ThreadService;

  beforeEach(() => {
    service = new ThreadService();
  });

  describe('generateThreadId', () => {
    it('should return a string starting with "thread_"', () => {
      const id = service.generateThreadId();
      expect(id).toMatch(/^thread_/);
    });

    it('should generate unique thread IDs', () => {
      const ids = new Set(
        Array.from({ length: 100 }, () => service.generateThreadId()),
      );
      expect(ids.size).toBe(100);
    });

    it('should return a UUID-based ID with "thread_" prefix', () => {
      const id = service.generateThreadId();
      expect(id).toMatch(
        /^thread_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
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
});
