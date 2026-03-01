import { ThreadService } from '../../src/thread/thread.service';

describe('ThreadService', () => {
  let service: ThreadService;

  beforeEach(() => {
    service = new ThreadService();
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
});
