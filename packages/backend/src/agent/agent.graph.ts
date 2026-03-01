import { StateGraph, interrupt, START, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { isAIMessage, ToolMessage } from '@langchain/core/messages';
import { AgentStateAnnotation, type AgentStateType } from './agent.state';
import { allTools } from './agent.tools';
import { TaskStatus } from '@todos/shared';

function createLLM() {
  const provider = process.env.LLM_PROVIDER || 'openai';

  if (provider === 'anthropic') {
    return new ChatAnthropic({
      model: 'claude-sonnet-4-6',
    }).bindTools(allTools);
  }

  return new ChatOpenAI({
    model: 'gpt-5-mini',
    reasoning: {
      effort: "low"
    },
  }).bindTools(allTools);
}

// Node: Chat — LLM decides what to do
async function chatNode(state: AgentStateType) {
  const llm = createLLM();

  const systemContent = [
    'You are a helpful todo assistant. You can add, delete, and change the status of tasks.',
    'Keep responses short. The user can already see the task list in the UI, so do not list or repeat tasks back to them.',
    'Current tasks:',
    JSON.stringify(state.tasks, null, 2),
  ].join('\n');

  const response = await llm.invoke([
    { role: 'system', content: systemContent },
    ...state.messages,
  ]);

  return { messages: [response] };
}

// Conditional edge: does the last message have tool calls?
function shouldContinue(state: AgentStateType) {
  const lastMsg = state.messages[state.messages.length - 1];
  if (
    isAIMessage(lastMsg) &&
    lastMsg.tool_calls &&
    lastMsg.tool_calls.length > 0
  ) {
    return 'parse_tool';
  }
  return END;
}

// Node: Parse ALL tool calls into pendingActions array
function parseToolNode(state: AgentStateType) {
  const lastMsg = state.messages[state.messages.length - 1];
  if (!isAIMessage(lastMsg) || !lastMsg.tool_calls?.length) {
    return {};
  }
  return {
    pendingActions: lastMsg.tool_calls.map((tc) => ({
      tool: tc.name as 'addTask' | 'deleteTask' | 'setTaskStatus',
      args: tc.args,
      toolCallId: tc.id,
    })),
  };
}

// Node: Approval gate — interrupt for destructive actions, skip for additive
function approvalNode(state: AgentStateType) {
  const actions = state.pendingActions;
  if (!actions.length) return {};

  // If the first action is additive, skip approval (execute will batch them)
  if (actions[0].tool === 'addTask') {
    return {};
  }

  // First action is destructive — interrupt for human approval
  const action = actions[0];
  const question =
    action.tool === 'deleteTask'
      ? `Delete task ${action.args.id}?`
      : `Change task ${action.args.id} status to "${action.args.status}"?`;

  const userResponse = interrupt({
    question,
    options: ['approve', 'reject'],
    pendingAction: action,
  });

  if (userResponse === 'reject') {
    return {
      messages: [new ToolMessage({ content: 'Action cancelled by user.', tool_call_id: action.toolCallId! })],
      pendingActions: actions.slice(1),
    };
  }

  return {};
}

// Node: Execute — batch additive actions, single destructive action
function executeNode(state: AgentStateType) {
  const actions = [...state.pendingActions];
  if (!actions.length) return {};

  let tasks = [...state.tasks];
  const toolMessages: ToolMessage[] = [];
  let processed = 0;

  if (actions[0].tool === 'addTask') {
    // Batch all consecutive additive actions
    while (processed < actions.length && actions[processed].tool === 'addTask') {
      const action = actions[processed];
      const maxId = tasks.reduce((m, t) => Math.max(m, t.id), 0);
      tasks.push({
        id: maxId + 1,
        title: action.args.title,
        status: TaskStatus.todo,
      });
      toolMessages.push(
        new ToolMessage({ content: `Added: "${action.args.title}"`, tool_call_id: action.toolCallId! }),
      );
      processed++;
    }
  } else {
    // Single destructive action (already approved)
    const action = actions[0];
    switch (action.tool) {
      case 'deleteTask': {
        tasks = tasks.filter((t) => t.id !== action.args.id);
        toolMessages.push(
          new ToolMessage({ content: `Deleted task ${action.args.id}`, tool_call_id: action.toolCallId! }),
        );
        break;
      }
      case 'setTaskStatus': {
        tasks = tasks.map((t) =>
          t.id === action.args.id ? { ...t, status: action.args.status } : t,
        );
        toolMessages.push(
          new ToolMessage({
            content: `Task ${action.args.id} status changed to ${action.args.status}`,
            tool_call_id: action.toolCallId!,
          }),
        );
        break;
      }
    }
    processed = 1;
  }

  return {
    tasks,
    pendingActions: actions.slice(processed),
    messages: toolMessages,
  };
}

// Node: Respond — LLM summarises what was done after tool execution
async function respondNode(state: AgentStateType) {
  const llm = createLLM();

  const response = await llm.invoke([
    {
      role: 'system',
      content:
        'You are a helpful todo assistant. Briefly confirm the actions you just performed in one short sentence. Do not list or repeat task titles — the user can already see them in the UI. Do not call any tools.',
    },
    ...state.messages,
  ]);

  return { messages: [response] };
}

// Conditional edge: loop back to approval if more pending actions remain
function shouldContinueAfterExecute(state: AgentStateType) {
  return state.pendingActions.length > 0 ? 'approval' : 'respond';
}

export function buildAgentGraph(checkpointer: any) {
  const graph = new StateGraph(AgentStateAnnotation)
    .addNode('chat', chatNode)
    .addNode('parse_tool', parseToolNode)
    .addNode('approval', approvalNode)
    .addNode('execute', executeNode)
    .addNode('respond', respondNode)
    .addEdge(START, 'chat')
    .addConditionalEdges('chat', shouldContinue, {
      parse_tool: 'parse_tool',
      [END]: END,
    })
    .addEdge('parse_tool', 'approval')
    .addEdge('approval', 'execute')
    .addConditionalEdges('execute', shouldContinueAfterExecute, {
      approval: 'approval',
      respond: 'respond',
    })
    .addEdge('respond', END);

  return graph.compile({ checkpointer });
}
