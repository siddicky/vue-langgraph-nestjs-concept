import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { buildPromptGeneratorGraph } from '../../src/prompt-generator/prompt-generator.graph';

// Mock the LLM providers so tests don't call real APIs
jest.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(() => ({
      bindTools: jest.fn().mockReturnValue({
        invoke: jest.fn(),
      }),
      invoke: jest.fn(),
    })),
  };
});

jest.mock('@langchain/anthropic', () => {
  return {
    ChatAnthropic: jest.fn().mockImplementation(() => ({
      bindTools: jest.fn().mockReturnValue({
        invoke: jest.fn(),
      }),
      invoke: jest.fn(),
    })),
  };
});

describe('buildPromptGeneratorGraph', () => {
  let checkpointer: MemorySaver;

  beforeEach(() => {
    checkpointer = new MemorySaver();
  });

  it('should compile a graph with a checkpointer', () => {
    const graph = buildPromptGeneratorGraph(checkpointer);
    expect(graph).toBeDefined();
  });

  it('should have the expected methods', () => {
    const graph = buildPromptGeneratorGraph(checkpointer);
    expect(typeof graph.stream).toBe('function');
    expect(typeof graph.invoke).toBe('function');
    expect(typeof graph.getState).toBe('function');
    expect(typeof graph.updateState).toBe('function');
  });
});

describe('Prompt Generator graph node logic', () => {
  let checkpointer: MemorySaver;

  beforeEach(() => {
    checkpointer = new MemorySaver();
    jest.clearAllMocks();
  });

  describe('info gathering with interrupt', () => {
    it('should interrupt when LLM asks a follow-up question (no tool call)', async () => {
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockResolvedValue(
            new AIMessage({
              content: 'What is the objective of the prompt you want to create?',
            }),
          ),
        }),
        invoke: jest.fn(),
      }));

      const graph = buildPromptGeneratorGraph(checkpointer);
      const threadId = 'test-gather-info';
      const config = { configurable: { thread_id: threadId } };

      const events: any[] = [];
      const stream = await graph.stream(
        {
          messages: [new HumanMessage('I want to create a prompt')],
        },
        { ...config, streamMode: 'updates' as const },
      );

      for await (const chunk of stream) {
        events.push(chunk);
      }

      // Should have an interrupt (LLM needs more info from user)
      const hasInterrupt = events.some((e) => e.__interrupt__);
      expect(hasInterrupt).toBe(true);

      // The AI message should be in state
      const state = await graph.getState(config);
      const msgs = state.values.messages;
      const aiMsg = msgs.find((m: any) => m.content?.includes('objective'));
      expect(aiMsg).toBeDefined();
    });
  });

  describe('resume after interrupt', () => {
    it('should resume and route back to gather_info after user provides input', async () => {
      const { Command } = await import('@langchain/langgraph');
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      let callCount = 0;
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount <= 2) {
              // First two calls: LLM asks follow-up questions
              return Promise.resolve(
                new AIMessage({
                  content: callCount === 1
                    ? 'What is the objective of the prompt?'
                    : 'What variables will the prompt use?',
                }),
              );
            }
            // Third call: LLM has enough info, calls the tool
            return Promise.resolve(
              new AIMessage({
                content: '',
                tool_calls: [
                  {
                    id: 'call_1',
                    name: 'PromptInstructions',
                    args: {
                      objective: 'Generate a summary',
                      variables: ['text'],
                      constraints: ['no opinions'],
                      requirements: ['be concise'],
                    },
                  },
                ],
              }),
            );
          }),
        }),
        invoke: jest.fn().mockResolvedValue(
          new AIMessage({
            content: 'Here is your prompt template:\n\nYou are a summarization assistant. Given the following {text}, provide a concise summary.',
          }),
        ),
      }));

      const graph = buildPromptGeneratorGraph(checkpointer);
      const threadId = 'test-resume';
      const config = { configurable: { thread_id: threadId } };

      // Turn 1: Initial message, LLM asks for objective
      const stream1 = await graph.stream(
        { messages: [new HumanMessage('I want to create a prompt')] },
        { ...config, streamMode: 'updates' as const },
      );
      for await (const _ of stream1) { /* consume */ }

      // Verify interrupt
      const state1 = await graph.getState(config);
      expect(state1.tasks.some((t: any) => t.interrupts?.length > 0)).toBe(true);

      // Turn 2: Resume with user answer, LLM asks another question
      const stream2 = await graph.stream(
        new Command({ resume: 'The objective is to generate a summary of text' }),
        { ...config, streamMode: 'updates' as const },
      );
      for await (const _ of stream2) { /* consume */ }

      // Should interrupt again (still gathering info)
      const state2 = await graph.getState(config);
      expect(state2.tasks.some((t: any) => t.interrupts?.length > 0)).toBe(true);

      // Messages should accumulate
      expect(state2.values.messages.length).toBeGreaterThan(state1.values.messages.length);
    });
  });

  describe('tool call triggers prompt generation', () => {
    it('should flow through tool_node to generate_prompt when LLM calls PromptInstructions', async () => {
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockResolvedValue(
            new AIMessage({
              content: '',
              tool_calls: [
                {
                  id: 'call_1',
                  name: 'PromptInstructions',
                  args: {
                    objective: 'Generate a summary',
                    variables: ['text', 'length'],
                    constraints: ['no opinions', 'no filler words'],
                    requirements: ['be concise', 'use bullet points'],
                  },
                },
              ],
            }),
          ),
        }),
        invoke: jest.fn().mockResolvedValue(
          new AIMessage({
            content: 'Here is your prompt template:\n\nYou are a summarization assistant. Given the following {text}, provide a concise summary in {length} bullet points. Do not include opinions or filler words.',
          }),
        ),
      }));

      const graph = buildPromptGeneratorGraph(checkpointer);
      const threadId = 'test-generate';
      const config = { configurable: { thread_id: threadId } };

      const events: any[] = [];
      const stream = await graph.stream(
        {
          messages: [
            new HumanMessage('Create a summarization prompt. Objective: summarize text. Variables: text, length. Constraints: no opinions, no filler. Requirements: concise, bullet points.'),
          ],
        },
        { ...config, streamMode: 'updates' as const },
      );

      for await (const chunk of stream) {
        events.push(chunk);
      }

      // Should NOT have an interrupt (tool was called, prompt was generated)
      const hasInterrupt = events.some((e) => e.__interrupt__);
      expect(hasInterrupt).toBe(false);

      // Final state should contain the generated prompt
      const state = await graph.getState(config);
      const msgs = state.values.messages;
      const lastMsg = msgs[msgs.length - 1];
      expect(lastMsg.content).toContain('prompt template');
    });
  });

  describe('multi-turn conversation to completion', () => {
    it('should handle multiple interrupt/resume cycles then generate prompt', async () => {
      const { Command } = await import('@langchain/langgraph');
      const { ChatOpenAI } = jest.requireMock('@langchain/openai');
      let gatherCallCount = 0;
      ChatOpenAI.mockImplementation(() => ({
        bindTools: () => ({
          invoke: jest.fn().mockImplementation(() => {
            gatherCallCount++;
            if (gatherCallCount === 1) {
              return Promise.resolve(
                new AIMessage({ content: 'What is the objective?' }),
              );
            }
            if (gatherCallCount === 2) {
              return Promise.resolve(
                new AIMessage({ content: 'What variables do you need?' }),
              );
            }
            // Third call: enough info, call tool
            return Promise.resolve(
              new AIMessage({
                content: '',
                tool_calls: [
                  {
                    id: 'call_final',
                    name: 'PromptInstructions',
                    args: {
                      objective: 'Translate text',
                      variables: ['text', 'target_language'],
                      constraints: ['preserve tone'],
                      requirements: ['accurate translation'],
                    },
                  },
                ],
              }),
            );
          }),
        }),
        invoke: jest.fn().mockResolvedValue(
          new AIMessage({
            content: 'Here is your translation prompt:\n\nTranslate the following {text} to {target_language}. Preserve the original tone. Ensure accurate translation.',
          }),
        ),
      }));

      const graph = buildPromptGeneratorGraph(checkpointer);
      const threadId = 'test-multi-turn';
      const config = { configurable: { thread_id: threadId } };

      // Turn 1: Initial message
      const stream1 = await graph.stream(
        { messages: [new HumanMessage('Help me create a prompt')] },
        { ...config, streamMode: 'updates' as const },
      );
      for await (const _ of stream1) { /* consume */ }

      // Turn 2: Provide objective
      const stream2 = await graph.stream(
        new Command({ resume: 'I want to translate text to different languages' }),
        { ...config, streamMode: 'updates' as const },
      );
      for await (const _ of stream2) { /* consume */ }

      // Turn 3: Provide remaining info — should call tool and generate prompt
      const events3: any[] = [];
      const stream3 = await graph.stream(
        new Command({ resume: 'Variables: text and target_language. Constraint: preserve tone. Requirement: accurate.' }),
        { ...config, streamMode: 'updates' as const },
      );
      for await (const chunk of stream3) {
        events3.push(chunk);
      }

      // Should complete without interrupt
      const hasInterrupt = events3.some((e) => e.__interrupt__);
      expect(hasInterrupt).toBe(false);

      // Final message should contain the generated prompt
      const state = await graph.getState(config);
      const msgs = state.values.messages;
      const lastMsg = msgs[msgs.length - 1];
      expect(lastMsg.content).toContain('translation prompt');
    });
  });
});
