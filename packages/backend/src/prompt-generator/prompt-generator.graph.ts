import { StateGraph, interrupt, START, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { isAIMessage, ToolMessage, HumanMessage } from '@langchain/core/messages';
import { PromptGeneratorStateAnnotation, type PromptGeneratorStateType } from './prompt-generator.state';
import { promptGeneratorTools } from './prompt-generator.tools';

const GATHER_INFO_SYSTEM_PROMPT = `Your job is to get information from the user about what type of prompt template they want to create.
You must get the following information from them:
- What the objective of the prompt is
- What variables will be passed into the prompt template
- Any constraints for what the output should NOT do
- Any requirements that the output MUST adhere to
Ask user to give all the information. You must get all the above information from the user, if not clear ask the user again.
Do not assume any answer by yourself, get it from the user.
After getting all the information from user, call the relevant tool.
Don't call the tool until you get all the information from user.
If user is not answering your question ask again`;

function createGatherInfoLLM() {
  const provider = process.env.LLM_PROVIDER || 'openai';

  if (provider === 'anthropic') {
    return new ChatAnthropic({
      model: 'claude-sonnet-4-6',
    }).bindTools(promptGeneratorTools);
  }

  return new ChatOpenAI({
    model: 'gpt-5-mini',
    temperature: 0,
  }).bindTools(promptGeneratorTools);
}

function createGeneratePromptLLM() {
  const provider = process.env.LLM_PROVIDER || 'openai';

  if (provider === 'anthropic') {
    return new ChatAnthropic({
      model: 'claude-sonnet-4-6',
    });
  }

  return new ChatOpenAI({
    model: 'gpt-5-mini',
    temperature: 0,
  });
}

// Node: Gather info — LLM asks user for prompt requirements
async function gatherInfoNode(state: PromptGeneratorStateType) {
  const llm = createGatherInfoLLM();

  const response = await llm.invoke([
    { role: 'system', content: GATHER_INFO_SYSTEM_PROMPT },
    ...state.messages,
  ]);

  return { messages: [response] };
}

// Conditional edge: check if LLM called the PromptInstructions tool
function afterGatherInfo(state: PromptGeneratorStateType) {
  const lastMsg = state.messages[state.messages.length - 1];
  if (
    isAIMessage(lastMsg) &&
    lastMsg.tool_calls &&
    lastMsg.tool_calls.length > 0
  ) {
    return 'tool_node';
  }
  return 'human_in_loop';
}

// Node: Human in the loop — interrupt to get user input
function humanInLoopNode(_state: PromptGeneratorStateType) {
  const input = interrupt('please give the requested data');
  return {
    messages: [new HumanMessage(input as string)],
    isInterrupted: false,
  };
}

// Node: Tool — create ToolMessage from the LLM's tool call
function toolNode(state: PromptGeneratorStateType) {
  const lastMsg = state.messages[state.messages.length - 1];
  if (!isAIMessage(lastMsg) || !lastMsg.tool_calls?.length) {
    return {};
  }

  const toolCall = lastMsg.tool_calls[0];
  return {
    messages: [
      new ToolMessage({
        content: JSON.stringify(toolCall.args),
        tool_call_id: toolCall.id!,
      }),
    ],
  };
}

// Node: Generate prompt — LLM generates the prompt template from gathered requirements
async function generatePromptNode(state: PromptGeneratorStateType) {
  const llm = createGeneratePromptLLM();

  const lastMsg = state.messages[state.messages.length - 1];
  const reqs = typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content);

  const response = await llm.invoke([
    {
      role: 'system',
      content: `Based on the following requirements, write a good prompt template:\n${reqs}`,
    },
  ]);

  return { messages: [response] };
}

export function buildPromptGeneratorGraph(checkpointer: any) {
  const graph = new StateGraph(PromptGeneratorStateAnnotation)
    .addNode('gather_info', gatherInfoNode)
    .addNode('human_in_loop', humanInLoopNode)
    .addNode('tool_node', toolNode)
    .addNode('generate_prompt', generatePromptNode)
    .addEdge(START, 'gather_info')
    .addConditionalEdges('gather_info', afterGatherInfo, {
      tool_node: 'tool_node',
      human_in_loop: 'human_in_loop',
    })
    .addEdge('human_in_loop', 'gather_info')
    .addEdge('tool_node', 'generate_prompt')
    .addEdge('generate_prompt', END);

  return graph.compile({ checkpointer });
}
