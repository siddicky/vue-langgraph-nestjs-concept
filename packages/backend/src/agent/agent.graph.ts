import { StateGraph, interrupt, START, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessage } from '@langchain/core/messages';
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
    model: 'gpt-4o',
  }).bindTools(allTools);
}

// Node: Chat — LLM decides what to do
async function chatNode(state: AgentStateType) {
  const llm = createLLM();

  const systemContent = [
    'You are a helpful todo assistant. You can add, delete, and change the status of tasks.',
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
    lastMsg instanceof AIMessage &&
    lastMsg.tool_calls &&
    lastMsg.tool_calls.length > 0
  ) {
    return 'parse_tool';
  }
  return END;
}

// Node: Parse the tool call into a pendingAction
function parseToolNode(state: AgentStateType) {
  const lastMsg = state.messages[state.messages.length - 1];
  if (!(lastMsg instanceof AIMessage) || !lastMsg.tool_calls?.length) {
    return {};
  }
  const toolCall = lastMsg.tool_calls[0];
  return {
    pendingAction: {
      tool: toolCall.name as 'addTask' | 'deleteTask' | 'setTaskStatus',
      args: toolCall.args,
    },
  };
}

// Node: Approval gate — interrupt for destructive actions
function approvalNode(state: AgentStateType) {
  const action = state.pendingAction;
  if (!action) return {};

  // Additive actions skip approval
  if (action.tool === 'addTask') {
    return {};
  }

  // Destructive actions require human approval
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
      messages: [new AIMessage('Action cancelled by user.')],
      pendingAction: null,
    };
  }

  return {};
}

// Node: Execute — mutate tasks in state
function executeNode(state: AgentStateType) {
  const action = state.pendingAction;
  if (!action) return {};

  let tasks = [...state.tasks];
  let confirmation = '';

  switch (action.tool) {
    case 'addTask': {
      const maxId = tasks.reduce((m, t) => Math.max(m, t.id), 0);
      tasks.push({
        id: maxId + 1,
        title: action.args.title,
        status: TaskStatus.todo,
      });
      confirmation = `Added: "${action.args.title}"`;
      break;
    }
    case 'deleteTask': {
      tasks = tasks.filter((t) => t.id !== action.args.id);
      confirmation = `Deleted task ${action.args.id}`;
      break;
    }
    case 'setTaskStatus': {
      tasks = tasks.map((t) =>
        t.id === action.args.id ? { ...t, status: action.args.status } : t,
      );
      confirmation = `Task ${action.args.id} status changed to ${action.args.status}`;
      break;
    }
  }

  return {
    tasks,
    pendingAction: null,
    messages: [new AIMessage(confirmation)],
  };
}

export function buildAgentGraph(checkpointer: any) {
  const graph = new StateGraph(AgentStateAnnotation)
    .addNode('chat', chatNode)
    .addNode('parse_tool', parseToolNode)
    .addNode('approval', approvalNode)
    .addNode('execute', executeNode)
    .addEdge(START, 'chat')
    .addConditionalEdges('chat', shouldContinue, {
      parse_tool: 'parse_tool',
      [END]: END,
    })
    .addEdge('parse_tool', 'approval')
    .addEdge('approval', 'execute')
    .addEdge('execute', END);

  return graph.compile({ checkpointer });
}
