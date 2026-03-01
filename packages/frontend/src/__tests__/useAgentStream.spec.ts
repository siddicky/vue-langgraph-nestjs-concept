import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAgentStream } from '../composables/useAgentStream';

// Helper to create a mock ReadableStream from SSE lines
function createMockSSEResponse(events: Array<{ type: string; data: any }>) {
  const sseText = events
    .map((e) => `data: ${JSON.stringify(e)}\n\n`)
    .join('');
  const encoder = new TextEncoder();
  const encoded = encoder.encode(sseText);

  let read = false;
  const body = {
    getReader: () => ({
      read: async () => {
        if (!read) {
          read = true;
          return { done: false, value: encoded };
        }
        return { done: true, value: undefined };
      },
      releaseLock: vi.fn(),
    }),
  };

  return { ok: true, body, json: vi.fn() } as any;
}

describe('useAgentStream', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start with null threadId', () => {
      const { threadId } = useAgentStream();
      expect(threadId.value).toBeNull();
    });

    it('should start with empty messages', () => {
      const { messages } = useAgentStream();
      expect(messages.value).toEqual([]);
    });

    it('should start with empty tasks', () => {
      const { tasks } = useAgentStream();
      expect(tasks.value).toEqual([]);
    });

    it('should start with isStreaming false', () => {
      const { isStreaming } = useAgentStream();
      expect(isStreaming.value).toBe(false);
    });

    it('should start with null interruptPayload', () => {
      const { interruptPayload } = useAgentStream();
      expect(interruptPayload.value).toBeNull();
    });
  });

  describe('createThread', () => {
    it('should fetch /agent/thread and set threadId', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ threadId: 'thread_abc' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const { createThread, threadId } = useAgentStream();
      await createThread();

      expect(mockFetch).toHaveBeenCalledWith('/agent/thread', { method: 'POST' });
      expect(threadId.value).toBe('thread_abc');
    });

    it('should throw when response is not ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      vi.stubGlobal('fetch', mockFetch);

      const { createThread } = useAgentStream();
      await expect(createThread()).rejects.toThrow(
        'Failed to create thread: 500 Internal Server Error',
      );
    });

    it('should throw when response is missing threadId', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', mockFetch);

      const { createThread } = useAgentStream();
      await expect(createThread()).rejects.toThrow('Server response missing threadId');
    });
  });

  describe('sendMessage', () => {
    it('should create a thread if none exists, then POST to chat', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        callCount++;
        if (url.endsWith('/agent/thread')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ threadId: 'thread_new' }),
          });
        }
        return Promise.resolve(
          createMockSSEResponse([
            { type: 'message_chunk', data: { role: 'assistant', content: 'Hi' } },
            { type: 'done', data: null },
          ]),
        );
      });
      vi.stubGlobal('fetch', mockFetch);

      const { sendMessage, messages } = useAgentStream();
      await sendMessage('Hello');

      // Should have called thread creation + chat
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // User message should be added locally
      expect(messages.value[0]).toEqual({ role: 'human', content: 'Hello' });
      // Assistant response should be added from stream
      expect(messages.value[1]).toEqual({ role: 'assistant', content: 'Hi' });
    });

    it('should handle state_update events by updating tasks', async () => {
      const tasks = [{ id: 1, title: 'New', status: 'todo' }];
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/agent/thread')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ threadId: 'thread_1' }),
          });
        }
        return Promise.resolve(
          createMockSSEResponse([
            { type: 'state_update', data: { tasks } },
            { type: 'done', data: null },
          ]),
        );
      });
      vi.stubGlobal('fetch', mockFetch);

      const stream = useAgentStream();
      await stream.sendMessage('Add task');

      expect(stream.tasks.value).toEqual(tasks);
    });

    it('should handle interrupt events', async () => {
      const interruptData = {
        question: 'Delete task 1?',
        options: ['approve', 'reject'],
        pendingAction: { tool: 'deleteTask', args: { id: 1 } },
      };
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/agent/thread')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ threadId: 'thread_1' }),
          });
        }
        return Promise.resolve(
          createMockSSEResponse([
            { type: 'interrupt', data: interruptData },
          ]),
        );
      });
      vi.stubGlobal('fetch', mockFetch);

      const stream = useAgentStream();
      await stream.sendMessage('Delete task 1');

      expect(stream.interruptPayload.value).toEqual(interruptData);
    });
  });

  describe('resumeWithInput', () => {
    it('should not call fetch if no threadId', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const { resumeWithInput } = useAgentStream();
      await resumeWithInput('approve');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should POST to /resume endpoint when threadId exists', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/agent/thread')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ threadId: 'thread_1' }),
          });
        }
        return Promise.resolve(
          createMockSSEResponse([
            { type: 'done', data: null },
          ]),
        );
      });
      vi.stubGlobal('fetch', mockFetch);

      const stream = useAgentStream();
      // Set up threadId
      await stream.createThread();

      await stream.resumeWithInput('approve');

      const resumeCall = mockFetch.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('/resume'),
      );
      expect(resumeCall).toBeDefined();
      expect(JSON.parse(resumeCall![1].body)).toEqual({ response: 'approve' });
    });
  });

  describe('getState', () => {
    it('should not fetch if no threadId', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const { getState } = useAgentStream();
      await getState();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('pushTasks', () => {
    it('should not fetch if no threadId', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const { pushTasks } = useAgentStream();
      await pushTasks([]);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should PUT to /state endpoint with tasks', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/agent/thread')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ threadId: 'thread_1' }),
          });
        }
        return Promise.resolve({ ok: true });
      });
      vi.stubGlobal('fetch', mockFetch);

      const stream = useAgentStream();
      await stream.createThread();

      const tasks = [{ id: 1, title: 'Test', status: 'todo' as const }];
      await stream.pushTasks(tasks as any);

      const putCall = mockFetch.mock.calls.find(
        (c: any[]) => c[1]?.method === 'PUT',
      );
      expect(putCall).toBeDefined();
      expect(JSON.parse(putCall![1].body)).toEqual({ tasks });
    });
  });

  describe('consumeStream error handling', () => {
    function threadMock() {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ threadId: 'thread_1' }),
      });
    }

    it('should throw when stream response is not ok', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/agent/thread')) return threadMock();
        return Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable' });
      });
      vi.stubGlobal('fetch', mockFetch);

      const stream = useAgentStream();
      await expect(stream.sendMessage('hello')).rejects.toThrow(
        'Stream request failed: 503 Service Unavailable',
      );
    });

    it('should not leave isStreaming true when stream response is not ok', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/agent/thread')) return threadMock();
        return Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable' });
      });
      vi.stubGlobal('fetch', mockFetch);

      const stream = useAgentStream();
      try { await stream.sendMessage('hello'); } catch { /* expected */ }
      expect(stream.isStreaming.value).toBe(false);
    });

    it('should throw when response body is null', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/agent/thread')) return threadMock();
        return Promise.resolve({ ok: true, body: null });
      });
      vi.stubGlobal('fetch', mockFetch);

      const stream = useAgentStream();
      await expect(stream.sendMessage('hello')).rejects.toThrow('Response body is null');
    });

    it('should reset isStreaming to false when read throws mid-stream', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/agent/thread')) return threadMock();
        const body = {
          getReader: () => ({
            read: async () => { throw new Error('Network error'); },
            releaseLock: vi.fn(),
          }),
        };
        return Promise.resolve({ ok: true, body });
      });
      vi.stubGlobal('fetch', mockFetch);

      const stream = useAgentStream();
      try { await stream.sendMessage('hello'); } catch { /* expected */ }
      expect(stream.isStreaming.value).toBe(false);
    });
  });
});
