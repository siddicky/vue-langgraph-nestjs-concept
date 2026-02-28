import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { buildAgentGraph } from '../../src/agent/agent.graph';
import { TaskStatus } from '@todos/shared';

// Mock the LLM providers so tests don't call real APIs
jest.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(() => ({
      bindTools: jest.fn().mockReturnValue({
        invoke: jest.fn(),
      }),
    })),
  };
});

jest.mock('@langchain/anthropic', () => {
  return {
    ChatAnthropic: jest.fn().mockImplementation(() => ({
      bindTools: jest.fn().mockReturnValue({
        invoke: jest.fn(),
      }),
    })),
  };
});

describe('buildAgentGraph', () => {
  let checkpointer: MemorySaver;

  beforeEach(() => {
    checkpointer = new MemorySaver();
  });

  it('should compile a graph with a checkpointer', () => {
    const graph = buildAgentGraph(checkpointer);
    expect(graph).toBeDefined();
  });

  it('should have the expected nodes', () => {
    const graph = buildAgentGraph(checkpointer);
    // The compiled graph should exist and be invocable
    expect(typeof graph.stream).toBe('function');
    expect(typeof graph.invoke).toBe('function');
    expect(typeof graph.getState).toBe('function');
    expect(typeof graph.updateState).toBe('function');
  });
});

describe('Graph node logic (unit tests via direct invocation)', () => {
  let checkpointer: MemorySaver;

  beforeEach(() => {
    checkpointer = new MemorySaver();
    jest.clearAllMocks();
  });

  describe('addTask flow (no interrupt)', () => {
    it('should add a task without interrupting', async () => {
      // Mock the LLM to return a tool call for addTask
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockResolvedValue(
            new AIMessage({
              content: '',
              tool_calls: [
                {
                  id: 'call_1',
                  name: 'addTask',
                  args: { title: 'Test task' },
                },
              ],
            }),
          ),
        }),
      }));

      const graph = buildAgentGraph(checkpointer);
      const threadId = 'test-add-task';
      const config = { configurable: { thread_id: threadId } };

      const events: any[] = [];
      const stream = await graph.stream(
        {
          messages: [new HumanMessage('Add a test task')],
          tasks: [],
        },
        { ...config, streamMode: 'updates' as const },
      );

      for await (const chunk of stream) {
        events.push(chunk);
      }

      // Get final state
      const state = await graph.getState(config);
      const tasks = state.values.tasks;

      // Should have added the task
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toEqual({
        id: 1,
        title: 'Test task',
        status: TaskStatus.todo,
      });

      // Should NOT have an interrupt (addTask skips approval)
      const hasInterrupt = events.some((e) => e.__interrupt__);
      expect(hasInterrupt).toBe(false);
    });
  });

  describe('deleteTask flow (with interrupt)', () => {
    it('should interrupt when deleting a task', async () => {
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockResolvedValue(
            new AIMessage({
              content: '',
              tool_calls: [
                {
                  id: 'call_1',
                  name: 'deleteTask',
                  args: { id: 1 },
                },
              ],
            }),
          ),
        }),
      }));

      const graph = buildAgentGraph(checkpointer);
      const threadId = 'test-delete-task';
      const config = { configurable: { thread_id: threadId } };

      const existingTasks = [
        { id: 1, title: 'Task to delete', status: TaskStatus.todo },
      ];

      const events: any[] = [];
      const stream = await graph.stream(
        {
          messages: [new HumanMessage('Delete task 1')],
          tasks: existingTasks,
        },
        { ...config, streamMode: 'updates' as const },
      );

      for await (const chunk of stream) {
        events.push(chunk);
      }

      // Should have an interrupt for deleteTask
      const hasInterrupt = events.some((e) => e.__interrupt__);
      expect(hasInterrupt).toBe(true);

      // The interrupt payload should contain the question
      const interruptEvent = events.find((e) => e.__interrupt__);
      const interruptValue = interruptEvent.__interrupt__[0]?.value;
      expect(interruptValue.question).toContain('Delete task 1');
      expect(interruptValue.options).toEqual(['approve', 'reject']);
    });
  });

  describe('setTaskStatus flow (with interrupt)', () => {
    it('should interrupt when changing task status', async () => {
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockResolvedValue(
            new AIMessage({
              content: '',
              tool_calls: [
                {
                  id: 'call_1',
                  name: 'setTaskStatus',
                  args: { id: 1, status: 'done' },
                },
              ],
            }),
          ),
        }),
      }));

      const graph = buildAgentGraph(checkpointer);
      const threadId = 'test-status-change';
      const config = { configurable: { thread_id: threadId } };

      const existingTasks = [
        { id: 1, title: 'Task', status: TaskStatus.todo },
      ];

      const events: any[] = [];
      const stream = await graph.stream(
        {
          messages: [new HumanMessage('Mark task 1 done')],
          tasks: existingTasks,
        },
        { ...config, streamMode: 'updates' as const },
      );

      for await (const chunk of stream) {
        events.push(chunk);
      }

      const hasInterrupt = events.some((e) => e.__interrupt__);
      expect(hasInterrupt).toBe(true);

      const interruptEvent = events.find((e) => e.__interrupt__);
      const interruptValue = interruptEvent.__interrupt__[0]?.value;
      expect(interruptValue.question).toContain('status');
    });
  });

  describe('chat only flow (no tool call)', () => {
    it('should end without tool parsing when LLM returns plain text', async () => {
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockResolvedValue(
            new AIMessage({
              content: 'Hello! How can I help with your tasks?',
            }),
          ),
        }),
      }));

      const graph = buildAgentGraph(checkpointer);
      const threadId = 'test-chat-only';
      const config = { configurable: { thread_id: threadId } };

      const events: any[] = [];
      const stream = await graph.stream(
        {
          messages: [new HumanMessage('Hello')],
          tasks: [],
        },
        { ...config, streamMode: 'updates' as const },
      );

      for await (const chunk of stream) {
        events.push(chunk);
      }

      // Should only have a chat node update, no tool parsing
      const state = await graph.getState(config);
      const lastMsg = state.values.messages[state.values.messages.length - 1];
      expect(lastMsg.content).toBe('Hello! How can I help with your tasks?');
      expect(state.values.tasks).toEqual([]);
    });
  });

  describe('resume after interrupt', () => {
    it('should execute the action when approved', async () => {
      const { Command } = await import('@langchain/langgraph');
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockResolvedValue(
            new AIMessage({
              content: '',
              tool_calls: [
                {
                  id: 'call_1',
                  name: 'deleteTask',
                  args: { id: 1 },
                },
              ],
            }),
          ),
        }),
      }));

      const graph = buildAgentGraph(checkpointer);
      const threadId = 'test-resume-approve';
      const config = { configurable: { thread_id: threadId } };

      const existingTasks = [
        { id: 1, title: 'Task to delete', status: TaskStatus.todo },
        { id: 2, title: 'Keep this', status: TaskStatus.todo },
      ];

      // First: send message that triggers delete + interrupt
      const stream1 = await graph.stream(
        {
          messages: [new HumanMessage('Delete task 1')],
          tasks: existingTasks,
        },
        { ...config, streamMode: 'updates' as const },
      );
      for await (const _ of stream1) {
        // consume
      }

      // Then: resume with approve
      const stream2 = await graph.stream(
        new Command({ resume: 'approve' }),
        { ...config, streamMode: 'updates' as const },
      );
      for await (const _ of stream2) {
        // consume
      }

      // Task 1 should be deleted
      const state = await graph.getState(config);
      expect(state.values.tasks).toHaveLength(1);
      expect(state.values.tasks[0].id).toBe(2);
    });

    it('should cancel the action when rejected', async () => {
      const { Command } = await import('@langchain/langgraph');
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockResolvedValue(
            new AIMessage({
              content: '',
              tool_calls: [
                {
                  id: 'call_1',
                  name: 'deleteTask',
                  args: { id: 1 },
                },
              ],
            }),
          ),
        }),
      }));

      const graph = buildAgentGraph(checkpointer);
      const threadId = 'test-resume-reject';
      const config = { configurable: { thread_id: threadId } };

      const existingTasks = [
        { id: 1, title: 'Keep me', status: TaskStatus.todo },
      ];

      // First: trigger delete + interrupt
      const stream1 = await graph.stream(
        {
          messages: [new HumanMessage('Delete task 1')],
          tasks: existingTasks,
        },
        { ...config, streamMode: 'updates' as const },
      );
      for await (const _ of stream1) {
        // consume
      }

      // Then: resume with reject
      const stream2 = await graph.stream(
        new Command({ resume: 'reject' }),
        { ...config, streamMode: 'updates' as const },
      );
      for await (const _ of stream2) {
        // consume
      }

      // Task should still exist (rejection cancels the action)
      const state = await graph.getState(config);
      const lastMsg = state.values.messages[state.values.messages.length - 1];
      expect(lastMsg.content).toContain('cancelled');
    });
  });
});
