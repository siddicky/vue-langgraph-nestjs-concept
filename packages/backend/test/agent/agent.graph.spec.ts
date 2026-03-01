import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
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

  describe('multi-turn conversation (ToolMessage validation)', () => {
    it('should handle a follow-up message after addTask without error', async () => {
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      let callCount = 0;
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              // First call: LLM returns a tool call for addTask
              return Promise.resolve(
                new AIMessage({
                  content: '',
                  tool_calls: [
                    {
                      id: 'call_add_1',
                      name: 'addTask',
                      args: { title: 'Groceries' },
                    },
                  ],
                }),
              );
            }
            // Second call: LLM returns plain text
            return Promise.resolve(
              new AIMessage({
                content: 'You have 1 task: Groceries.',
              }),
            );
          }),
        }),
      }));

      const graph = buildAgentGraph(checkpointer);
      const threadId = 'test-multi-turn';
      const config = { configurable: { thread_id: threadId } };

      // Turn 1: addTask
      const stream1 = await graph.stream(
        {
          messages: [new HumanMessage('Add a task called groceries')],
          tasks: [],
        },
        { ...config, streamMode: 'updates' as const },
      );
      for await (const _ of stream1) {
        // consume
      }

      // Verify task was added
      const stateAfterAdd = await graph.getState(config);
      expect(stateAfterAdd.values.tasks).toHaveLength(1);
      expect(stateAfterAdd.values.tasks[0].title).toBe('Groceries');

      // Verify the executeNode produced a ToolMessage (not AIMessage)
      const messages = stateAfterAdd.values.messages;
      const toolMessages = messages.filter((m: any) => m instanceof ToolMessage);
      expect(toolMessages.length).toBeGreaterThanOrEqual(1);

      // Turn 2: follow-up plain text question on the same thread
      const stream2 = await graph.stream(
        {
          messages: [new HumanMessage('What tasks do I have?')],
        },
        { ...config, streamMode: 'updates' as const },
      );

      const turn2Events: any[] = [];
      for await (const chunk of stream2) {
        turn2Events.push(chunk);
      }

      // Should complete without error
      const stateAfterQuery = await graph.getState(config);
      const lastMsg = stateAfterQuery.values.messages[stateAfterQuery.values.messages.length - 1];
      expect(lastMsg.content).toBe('You have 1 task: Groceries.');
    });
  });

  describe('parallel tool calls', () => {
    it('should add multiple tasks when LLM returns parallel addTask calls', async () => {
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockResolvedValue(
            new AIMessage({
              content: '',
              tool_calls: [
                { id: 'call_1', name: 'addTask', args: { title: 'Groceries' } },
                { id: 'call_2', name: 'addTask', args: { title: 'Laundry' } },
                { id: 'call_3', name: 'addTask', args: { title: 'Dishes' } },
                { id: 'call_4', name: 'addTask', args: { title: 'Cooking' } },
              ],
            }),
          ),
        }),
      }));

      const graph = buildAgentGraph(checkpointer);
      const threadId = 'test-parallel-add';
      const config = { configurable: { thread_id: threadId } };

      const events: any[] = [];
      const stream = await graph.stream(
        {
          messages: [new HumanMessage('Add 4 tasks: groceries, laundry, dishes, cooking')],
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

      // All 4 tasks should have been added
      expect(tasks).toHaveLength(4);
      expect(tasks.map((t: any) => t.title)).toEqual([
        'Groceries',
        'Laundry',
        'Dishes',
        'Cooking',
      ]);

      // IDs should be sequential
      expect(tasks.map((t: any) => t.id)).toEqual([1, 2, 3, 4]);

      // All should have todo status
      tasks.forEach((t: any) => {
        expect(t.status).toBe(TaskStatus.todo);
      });

      // No interrupt should have occurred (all addTask)
      const hasInterrupt = events.some((e) => e.__interrupt__);
      expect(hasInterrupt).toBe(false);

      // pendingActions should be empty after completion
      expect(state.values.pendingActions).toEqual([]);
    });

    it('should handle mixed additive and destructive actions', async () => {
      const { Command } = await import('@langchain/langgraph');
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockResolvedValue(
            new AIMessage({
              content: '',
              tool_calls: [
                { id: 'call_1', name: 'addTask', args: { title: 'New task 1' } },
                { id: 'call_2', name: 'addTask', args: { title: 'New task 2' } },
                { id: 'call_3', name: 'deleteTask', args: { id: 1 } },
              ],
            }),
          ),
        }),
      }));

      const graph = buildAgentGraph(checkpointer);
      const threadId = 'test-mixed-actions';
      const config = { configurable: { thread_id: threadId } };

      const existingTasks = [
        { id: 1, title: 'Old task', status: TaskStatus.todo },
      ];

      // First stream: should batch the 2 addTask actions, then interrupt on deleteTask
      const events: any[] = [];
      const stream1 = await graph.stream(
        {
          messages: [new HumanMessage('Add 2 tasks and delete task 1')],
          tasks: existingTasks,
        },
        { ...config, streamMode: 'updates' as const },
      );

      for await (const chunk of stream1) {
        events.push(chunk);
      }

      // Should have interrupted for the deleteTask
      const hasInterrupt = events.some((e) => e.__interrupt__);
      expect(hasInterrupt).toBe(true);

      // At this point, the 2 addTask actions should have been executed
      const stateBeforeResume = await graph.getState(config);
      const tasksBeforeResume = stateBeforeResume.values.tasks;
      expect(tasksBeforeResume).toHaveLength(3); // 1 existing + 2 added
      expect(tasksBeforeResume.map((t: any) => t.title)).toContain('New task 1');
      expect(tasksBeforeResume.map((t: any) => t.title)).toContain('New task 2');

      // Resume with approve to execute the deleteTask
      const stream2 = await graph.stream(
        new Command({ resume: 'approve' }),
        { ...config, streamMode: 'updates' as const },
      );
      for await (const _ of stream2) {
        // consume
      }

      // After resume: old task (id 1) should be deleted, new tasks remain
      const finalState = await graph.getState(config);
      const finalTasks = finalState.values.tasks;
      expect(finalTasks).toHaveLength(2);
      expect(finalTasks.map((t: any) => t.title)).toEqual(['New task 1', 'New task 2']);
      expect(finalState.values.pendingActions).toEqual([]);
    });
  });
});
