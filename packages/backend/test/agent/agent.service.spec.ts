jest.mock('@langchain/langgraph-sdk', () => ({ Client: jest.fn() }));

import { LocalAgentService } from '../../src/agent/agent.service';
import { ThreadService } from '../../src/thread/thread.service';
import { ConfigService } from '@nestjs/config';
import { TaskStatus } from '@todos/shared';

// Mock the graph builder
jest.mock('../../src/agent/agent.graph', () => ({
  buildAgentGraph: jest.fn(),
}));

describe('LocalAgentService', () => {
  let service: LocalAgentService;
  let threadService: ThreadService;
  let mockGraph: any;

  beforeEach(() => {
    const configService = { get: jest.fn().mockReturnValue('local') } as any;
    threadService = new ThreadService(configService);

    mockGraph = {
      stream: jest.fn(),
      getState: jest.fn(),
      updateState: jest.fn(),
      getStateHistory: jest.fn(),
    };

    const { buildAgentGraph } = require('../../src/agent/agent.graph');
    buildAgentGraph.mockReturnValue(mockGraph);

    service = new LocalAgentService(threadService);
    service.onModuleInit();
  });

  describe('createThread', () => {
    it('should delegate to threadService.generateThreadId and return UUID', () => {
      const spy = jest.spyOn(threadService, 'generateThreadId');
      const result = service.createThread();
      expect(spy).toHaveBeenCalled();
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('getState', () => {
    it('should return ThreadState format with checkpoint info', async () => {
      const mockValues = { messages: [], tasks: [], pendingActions: [] };
      mockGraph.getState.mockResolvedValue({
        values: mockValues,
        next: [],
        config: { configurable: { thread_id: 'tid', checkpoint_id: 'cid' } },
        metadata: {},
        tasks: [],
      });

      const result = await service.getState('tid');
      expect(result.values).toEqual(mockValues);
      expect(result.next).toEqual([]);
      expect(result.checkpoint.thread_id).toBe('tid');
      expect(result.checkpoint.checkpoint_id).toBe('cid');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('parent_checkpoint');
      expect(result).toHaveProperty('tasks');
    });
  });

  describe('updateState', () => {
    it('should update state and return configurable checkpoint info', async () => {
      const tasks = [{ id: 1, title: 'Updated', status: TaskStatus.done }];
      mockGraph.updateState.mockResolvedValue({
        configurable: { thread_id: 'tid', checkpoint_id: 'new-cid' },
      });

      const result = await service.updateState('tid', { tasks });
      expect(mockGraph.updateState).toHaveBeenCalled();
      expect(result.configurable.thread_id).toBe('tid');
      expect(result.configurable.checkpoint_id).toBe('new-cid');
    });
  });

  describe('streamRun', () => {
    it('should emit metadata event first', async () => {
      mockGraph.stream.mockResolvedValue(
        (async function* () {
          // empty stream
        })(),
      );
      mockGraph.getState.mockResolvedValue({ tasks: [], values: {} });

      const events: any[] = [];
      for await (const event of service.streamRun('tid', {
        input: { messages: [{ type: 'human', content: 'Hi' }] },
      })) {
        events.push(event);
      }

      expect(events[0].event).toBe('metadata');
      expect(events[0].data).toHaveProperty('run_id');
      expect(events[0].data.attempt).toBe(1);
    });

    it('should emit values events from stream', async () => {
      mockGraph.stream.mockResolvedValue(
        (async function* () {
          yield ['values', { messages: [], tasks: [], pendingActions: [] }];
        })(),
      );
      mockGraph.getState.mockResolvedValue({ tasks: [], values: {} });

      const events: any[] = [];
      for await (const event of service.streamRun('tid', {
        input: { messages: [{ type: 'human', content: 'Hi' }] },
      })) {
        events.push(event);
      }

      const valuesEvents = events.filter((e) => e.event === 'values');
      expect(valuesEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should emit messages events from stream', async () => {
      const mockMsg = { type: 'ai', content: 'Hello!', id: 'msg_1' };
      mockGraph.stream.mockResolvedValue(
        (async function* () {
          yield ['messages', [mockMsg, { langgraph_checkpoint_ns: '' }]];
        })(),
      );
      mockGraph.getState.mockResolvedValue({ tasks: [], values: {} });

      const events: any[] = [];
      for await (const event of service.streamRun('tid', {
        input: { messages: [{ type: 'human', content: 'Hi' }] },
      })) {
        events.push(event);
      }

      const msgEvents = events.filter((e) => e.event === 'messages');
      expect(msgEvents.length).toBe(1);
      expect(msgEvents[0].data[0].content).toBe('Hello!');
    });

    it('should emit final values event when interrupted', async () => {
      mockGraph.stream.mockResolvedValue(
        (async function* () {
          yield ['values', { messages: [], tasks: [] }];
        })(),
      );
      mockGraph.getState.mockResolvedValue({
        tasks: [{ id: 't1', name: 'approval', interrupts: [{ value: { question: 'Delete?' } }] }],
        values: { messages: [], tasks: [] },
      });

      const events: any[] = [];
      for await (const event of service.streamRun('tid', {
        input: { messages: [{ type: 'human', content: 'delete task 1' }] },
      })) {
        events.push(event);
      }

      // Should have an extra values event for the interrupt
      const valuesEvents = events.filter((e) => e.event === 'values');
      expect(valuesEvents.length).toBe(2);
    });

    it('should handle command for resume', async () => {
      mockGraph.stream.mockResolvedValue(
        (async function* () {
          yield ['values', { messages: [], tasks: [] }];
        })(),
      );
      mockGraph.getState.mockResolvedValue({ tasks: [], values: {} });

      const events: any[] = [];
      for await (const event of service.streamRun('tid', {
        command: { resume: 'approve' },
      })) {
        events.push(event);
      }

      expect(events[0].event).toBe('metadata');
      // graph.stream should have been called with a Command
      const streamCall = mockGraph.stream.mock.calls[0];
      expect(streamCall[0]).toBeDefined(); // Command object
    });
  });

  describe('getHistory', () => {
    it('should return array of ThreadState from state history', async () => {
      mockGraph.getStateHistory.mockReturnValue(
        (async function* () {
          yield {
            values: { messages: [], tasks: [] },
            next: [],
            config: { configurable: { thread_id: 'tid', checkpoint_id: 'c2' } },
            parentConfig: { configurable: { thread_id: 'tid', checkpoint_id: 'c1' } },
            metadata: {},
            tasks: [],
          };
          yield {
            values: { messages: [], tasks: [] },
            next: [],
            config: { configurable: { thread_id: 'tid', checkpoint_id: 'c1' } },
            metadata: {},
            tasks: [],
          };
        })(),
      );

      const result = await service.getHistory('tid');
      expect(result).toHaveLength(2);
      expect(result[0].checkpoint.checkpoint_id).toBe('c2');
      expect(result[0].parent_checkpoint?.checkpoint_id).toBe('c1');
      expect(result[1].checkpoint.checkpoint_id).toBe('c1');
      expect(result[1].parent_checkpoint).toBeNull();
    });

    it('should respect limit parameter', async () => {
      mockGraph.getStateHistory.mockReturnValue(
        (async function* () {
          for (let i = 0; i < 20; i++) {
            yield {
              values: {},
              next: [],
              config: { configurable: { thread_id: 'tid', checkpoint_id: `c${i}` } },
              metadata: {},
              tasks: [],
            };
          }
        })(),
      );

      const result = await service.getHistory('tid', 5);
      expect(result).toHaveLength(5);
    });
  });
});
