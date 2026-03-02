jest.mock('@langchain/langgraph-sdk', () => ({ Client: jest.fn() }));

import { RemoteAgentService } from '../../src/agent/remote-agent.service';

describe('RemoteAgentService', () => {
  let service: RemoteAgentService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      threads: {
        create: jest.fn(),
        getState: jest.fn(),
        updateState: jest.fn(),
        getHistory: jest.fn(),
      },
      runs: {
        stream: jest.fn(),
      },
    };

    service = new RemoteAgentService(mockClient);
  });

  describe('createThread', () => {
    it('should delegate to client.threads.create and return thread_id', async () => {
      mockClient.threads.create.mockResolvedValue({
        thread_id: 'remote-tid-123',
        created_at: '2026-01-01T00:00:00Z',
      });

      const result = await service.createThread();
      expect(result).toBe('remote-tid-123');
      expect(mockClient.threads.create).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return mapped ThreadState from SDK response', async () => {
      mockClient.threads.getState.mockResolvedValue({
        values: { messages: [], tasks: [] },
        next: ['chat'],
        checkpoint: { thread_id: 'tid', checkpoint_id: 'cid', checkpoint_ns: '' },
        metadata: { step: 1 },
        created_at: '2026-01-01T00:00:00Z',
        parent_checkpoint: null,
        tasks: [],
      });

      const result = await service.getState('tid');
      expect(result.values).toEqual({ messages: [], tasks: [] });
      expect(result.next).toEqual(['chat']);
      expect(result.checkpoint.thread_id).toBe('tid');
      expect(result.checkpoint.checkpoint_id).toBe('cid');
      expect(result.metadata).toEqual({ step: 1 });
      expect(result.parent_checkpoint).toBeNull();
      expect(mockClient.threads.getState).toHaveBeenCalledWith('tid');
    });

    it('should map parent_checkpoint when present', async () => {
      mockClient.threads.getState.mockResolvedValue({
        values: {},
        next: [],
        checkpoint: { thread_id: 'tid', checkpoint_id: 'c2', checkpoint_ns: '' },
        metadata: {},
        created_at: '2026-01-01T00:00:00Z',
        parent_checkpoint: { thread_id: 'tid', checkpoint_id: 'c1', checkpoint_ns: '' },
        tasks: [],
      });

      const result = await service.getState('tid');
      expect(result.parent_checkpoint).toEqual({
        thread_id: 'tid',
        checkpoint_id: 'c1',
        checkpoint_ns: '',
      });
    });
  });

  describe('updateState', () => {
    it('should delegate to client.threads.updateState', async () => {
      mockClient.threads.updateState.mockResolvedValue({
        configurable: { thread_id: 'tid', checkpoint_id: 'new-cid', checkpoint_ns: '' },
      });

      const result = await service.updateState('tid', { tasks: [] });
      expect(result.configurable.thread_id).toBe('tid');
      expect(result.configurable.checkpoint_id).toBe('new-cid');
      expect(mockClient.threads.updateState).toHaveBeenCalledWith('tid', {
        values: { tasks: [] },
      });
    });

    it('should pass asNode when provided', async () => {
      mockClient.threads.updateState.mockResolvedValue({
        configurable: { thread_id: 'tid', checkpoint_id: 'cid', checkpoint_ns: '' },
      });

      await service.updateState('tid', { tasks: [] }, 'chat');
      expect(mockClient.threads.updateState).toHaveBeenCalledWith('tid', {
        values: { tasks: [] },
        asNode: 'chat',
      });
    });
  });

  describe('streamRun', () => {
    it('should yield events from client.runs.stream with input', async () => {
      const mockEvents = [
        { event: 'metadata', data: { run_id: 'run-1', attempt: 1 } },
        { event: 'values', data: { messages: [], tasks: [] } },
      ];

      mockClient.runs.stream.mockReturnValue(
        (async function* () {
          for (const e of mockEvents) yield e;
        })(),
      );

      const events: any[] = [];
      for await (const event of service.streamRun('tid', {
        input: { messages: [{ type: 'human', content: 'Hi' }] },
        assistant_id: 'agent',
      })) {
        events.push(event);
      }

      expect(events).toHaveLength(2);
      expect(events[0].event).toBe('metadata');
      expect(events[1].event).toBe('values');
      expect(mockClient.runs.stream).toHaveBeenCalledWith('tid', 'agent', {
        input: { messages: [{ type: 'human', content: 'Hi' }] },
        streamMode: ['values', 'messages'],
      });
    });

    it('should pass command for resume flow', async () => {
      mockClient.runs.stream.mockReturnValue(
        (async function* () {
          yield { event: 'metadata', data: { run_id: 'run-2' } };
        })(),
      );

      const events: any[] = [];
      for await (const event of service.streamRun('tid', {
        command: { resume: 'approve' },
      })) {
        events.push(event);
      }

      expect(mockClient.runs.stream).toHaveBeenCalledWith('tid', 'agent', {
        command: { resume: 'approve' },
        streamMode: ['values', 'messages'],
      });
    });

    it('should default assistant_id to "agent" when not provided', async () => {
      mockClient.runs.stream.mockReturnValue(
        (async function* () {
          yield { event: 'metadata', data: {} };
        })(),
      );

      for await (const _ of service.streamRun('tid', { input: {} })) {
        // consume
      }

      expect(mockClient.runs.stream).toHaveBeenCalledWith(
        'tid',
        'agent',
        expect.any(Object),
      );
    });

    it('should pass custom stream_mode when provided', async () => {
      mockClient.runs.stream.mockReturnValue(
        (async function* () {
          yield { event: 'updates', data: {} };
        })(),
      );

      for await (const _ of service.streamRun('tid', {
        input: {},
        stream_mode: ['updates'],
      })) {
        // consume
      }

      expect(mockClient.runs.stream).toHaveBeenCalledWith('tid', 'agent', {
        input: {},
        streamMode: ['updates'],
      });
    });
  });

  describe('getHistory', () => {
    it('should return mapped ThreadState array', async () => {
      mockClient.threads.getHistory.mockResolvedValue([
        {
          values: { messages: [] },
          next: [],
          checkpoint: { thread_id: 'tid', checkpoint_id: 'c2', checkpoint_ns: '' },
          metadata: {},
          created_at: '2026-01-01T00:00:01Z',
          parent_checkpoint: { thread_id: 'tid', checkpoint_id: 'c1', checkpoint_ns: '' },
          tasks: [],
        },
        {
          values: { messages: [] },
          next: [],
          checkpoint: { thread_id: 'tid', checkpoint_id: 'c1', checkpoint_ns: '' },
          metadata: {},
          created_at: '2026-01-01T00:00:00Z',
          parent_checkpoint: null,
          tasks: [],
        },
      ]);

      const result = await service.getHistory('tid', 10);
      expect(result).toHaveLength(2);
      expect(result[0].checkpoint.checkpoint_id).toBe('c2');
      expect(result[0].parent_checkpoint?.checkpoint_id).toBe('c1');
      expect(result[1].parent_checkpoint).toBeNull();
      expect(mockClient.threads.getHistory).toHaveBeenCalledWith('tid', { limit: 10 });
    });

    it('should default limit to 10', async () => {
      mockClient.threads.getHistory.mockResolvedValue([]);

      await service.getHistory('tid');
      expect(mockClient.threads.getHistory).toHaveBeenCalledWith('tid', { limit: 10 });
    });
  });
});
