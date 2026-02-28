import { AgentService } from '../../src/agent/agent.service';
import { ThreadService } from '../../src/thread/thread.service';
import { TaskStatus, type StreamEvent } from '@todos/shared';

// Mock the graph builder
jest.mock('../../src/agent/agent.graph', () => ({
  buildAgentGraph: jest.fn(),
}));

describe('AgentService', () => {
  let service: AgentService;
  let threadService: ThreadService;
  let mockGraph: any;

  beforeEach(() => {
    threadService = new ThreadService();

    mockGraph = {
      stream: jest.fn(),
      getState: jest.fn(),
      updateState: jest.fn(),
    };

    const { buildAgentGraph } = require('../../src/agent/agent.graph');
    buildAgentGraph.mockReturnValue(mockGraph);

    service = new AgentService(threadService);
    service.onModuleInit();
  });

  describe('createThread', () => {
    it('should delegate to threadService.generateThreadId', () => {
      const spy = jest.spyOn(threadService, 'generateThreadId');
      const result = service.createThread();
      expect(spy).toHaveBeenCalled();
      expect(result).toMatch(/^thread_/);
    });
  });

  describe('streamChat', () => {
    it('should yield message_chunk events from stream', async () => {
      const mockChunks = [
        { chat: { messages: [{ content: 'Hello!' }] } },
      ];

      mockGraph.stream.mockResolvedValue(
        (async function* () {
          for (const chunk of mockChunks) yield chunk;
        })(),
      );

      const events: StreamEvent[] = [];
      for await (const event of service.streamChat('thread_1', 'Hi')) {
        events.push(event);
      }

      expect(events.some((e) => e.type === 'message_chunk')).toBe(true);
      expect(events[events.length - 1].type).toBe('done');
    });

    it('should yield state_update events when tasks change', async () => {
      const tasks = [{ id: 1, title: 'Test', status: 'todo' }];
      const mockChunks = [
        { execute: { tasks, messages: [{ content: 'Added' }] } },
      ];

      mockGraph.stream.mockResolvedValue(
        (async function* () {
          for (const chunk of mockChunks) yield chunk;
        })(),
      );

      const events: StreamEvent[] = [];
      for await (const event of service.streamChat('thread_1', 'add task')) {
        events.push(event);
      }

      const stateUpdate = events.find((e) => e.type === 'state_update');
      expect(stateUpdate).toBeDefined();
      expect(stateUpdate!.data.tasks).toEqual(tasks);
    });

    it('should yield interrupt event and stop when __interrupt__ is received', async () => {
      const interruptPayload = {
        question: 'Delete task 1?',
        options: ['approve', 'reject'],
      };

      mockGraph.stream.mockResolvedValue(
        (async function* () {
          yield { __interrupt__: [{ value: interruptPayload }] };
          // This should not be reached
          yield { chat: { messages: [{ content: 'should not appear' }] } };
        })(),
      );

      const events: StreamEvent[] = [];
      for await (const event of service.streamChat('thread_1', 'delete task 1')) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('interrupt');
      expect(events[0].data).toEqual(interruptPayload);
    });

    it('should skip empty message content', async () => {
      mockGraph.stream.mockResolvedValue(
        (async function* () {
          yield { chat: { messages: [{ content: '' }] } };
        })(),
      );

      const events: StreamEvent[] = [];
      for await (const event of service.streamChat('thread_1', 'Hi')) {
        events.push(event);
      }

      const messageEvents = events.filter((e) => e.type === 'message_chunk');
      expect(messageEvents).toHaveLength(0);
    });
  });

  describe('resumeAfterInterrupt', () => {
    it('should yield events from resumed stream', async () => {
      const tasks = [{ id: 2, title: 'Remaining', status: 'todo' }];
      mockGraph.stream.mockResolvedValue(
        (async function* () {
          yield {
            execute: {
              tasks,
              messages: [{ content: 'Deleted task 1' }],
            },
          };
        })(),
      );

      const events: StreamEvent[] = [];
      for await (const event of service.resumeAfterInterrupt('thread_1', 'approve')) {
        events.push(event);
      }

      expect(events.some((e) => e.type === 'state_update')).toBe(true);
      expect(events.some((e) => e.type === 'message_chunk')).toBe(true);
    });
  });

  describe('getState', () => {
    it('should return graph state values', async () => {
      const mockValues = { messages: [], tasks: [], pendingActions: [] };
      mockGraph.getState.mockResolvedValue({ values: mockValues });

      const result = await service.getState('thread_1');
      expect(result).toEqual(mockValues);
    });
  });

  describe('updateState', () => {
    it('should update state and return new values', async () => {
      const tasks = [{ id: 1, title: 'Updated', status: TaskStatus.done }];
      const mockValues = { messages: [], tasks, pendingActions: [] };
      mockGraph.updateState.mockResolvedValue(undefined);
      mockGraph.getState.mockResolvedValue({ values: mockValues });

      const result = await service.updateState('thread_1', { tasks });
      expect(mockGraph.updateState).toHaveBeenCalled();
      expect(result).toEqual(mockValues);
    });
  });
});
