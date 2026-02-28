import { StateGraph, START, END, interrupt, Command } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { AgentStateAnnotation, AgentStateType } from './agent.state'
import { agentTools, addTaskTool, deleteTaskTool, setTaskStatusTool } from './agent.tools'
import { Task, TaskStatus } from '@todos/shared'
import { PendingAction } from '@todos/shared'
import { MemorySaver } from '@langchain/langgraph'

// Nodes

async function chatNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const model = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  }).bindTools(agentTools)

  const systemPrompt = `You are a helpful todo list assistant. Help users manage their tasks.

Current tasks:
${
  state.tasks.length === 0
    ? 'No tasks yet.'
    : state.tasks.map((t) => `- [${t.id}] ${t.title} (${t.status})`).join('\n')
}

You can add tasks, delete tasks, or change task statuses using the provided tools.
When users ask you to delete tasks or change their status, use the appropriate tool.
`

  const messages = [
    new HumanMessage({ content: systemPrompt, name: 'system_context' }),
    ...state.messages,
  ]

  const response = await model.invoke(messages)
  return { messages: [response] }
}

async function parseToolNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage

  if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    return { pendingAction: null }
  }

  const toolCall = lastMessage.tool_calls[0]
  const pendingAction: PendingAction = {
    tool: toolCall.name as PendingAction['tool'],
    args: toolCall.args as Record<string, any>,
  }

  return { pendingAction }
}

async function approvalNode(state: AgentStateType): Promise<Partial<AgentStateType> | Command> {
  const { pendingAction } = state

  if (!pendingAction) {
    return {}
  }

  // addTask does not need approval; destructive actions do
  if (pendingAction.tool === 'addTask') {
    return {}
  }

  const actionDescriptions: Record<string, string> = {
    deleteTask: `delete task #${pendingAction.args.id}`,
    setTaskStatus: `change task #${pendingAction.args.id} status to "${pendingAction.args.status}"`,
  }

  const question = `Do you want me to ${actionDescriptions[pendingAction.tool] || 'perform this action'}?`

  const userResponse = interrupt({
    question,
    options: ['yes', 'no'],
    pendingAction,
  })

  if (userResponse === 'no' || userResponse === 'No' || userResponse === 'n') {
    return new Command({
      goto: END,
      update: { pendingAction: null },
    })
  }

  return {}
}

async function executeNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const { pendingAction, tasks } = state

  if (!pendingAction) {
    // Execute the tool to produce a ToolMessage for the LLM
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      const toolCall = lastMessage.tool_calls[0]
      const toolMessage = new ToolMessage({
        content: 'Action skipped.',
        tool_call_id: toolCall.id || '',
      })
      return { messages: [toolMessage] }
    }
    return {}
  }

  let updatedTasks = [...tasks]
  let resultMessage = ''

  switch (pendingAction.tool) {
    case 'addTask': {
      const maxId = updatedTasks.length > 0 ? Math.max(...updatedTasks.map((t) => t.id)) : 0
      const newTask: Task = {
        id: maxId + 1,
        title: pendingAction.args.title as string,
        status: TaskStatus.todo,
      }
      updatedTasks = [...updatedTasks, newTask]
      resultMessage = `Task "${newTask.title}" added with ID ${newTask.id}.`
      break
    }
    case 'deleteTask': {
      const taskId = pendingAction.args.id as number
      updatedTasks = updatedTasks.filter((t) => t.id !== taskId)
      resultMessage = `Task #${taskId} deleted.`
      break
    }
    case 'setTaskStatus': {
      const taskId = pendingAction.args.id as number
      const newStatus = pendingAction.args.status as TaskStatus
      updatedTasks = updatedTasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      resultMessage = `Task #${taskId} status updated to "${newStatus}".`
      break
    }
  }

  // Find the tool call ID to create a proper ToolMessage
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage
  const toolCallId =
    lastMessage.tool_calls && lastMessage.tool_calls.length > 0
      ? lastMessage.tool_calls[0].id || ''
      : ''

  const toolMessage = new ToolMessage({
    content: resultMessage,
    tool_call_id: toolCallId,
  })

  return {
    tasks: updatedTasks,
    pendingAction: null,
    messages: [toolMessage],
  }
}

// Conditional edge: does the chat response have a tool call?
function hasToolCall(state: AgentStateType): string {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return 'parse_tool'
  }
  return END
}

// Build the graph
export function buildAgentGraph(checkpointer: MemorySaver) {
  const graph = new StateGraph(AgentStateAnnotation)
    .addNode('chat', chatNode)
    .addNode('parse_tool', parseToolNode)
    .addNode('approval', approvalNode)
    .addNode('execute', executeNode)
    .addEdge(START, 'chat')
    .addConditionalEdges('chat', hasToolCall, {
      parse_tool: 'parse_tool',
      [END]: END,
    })
    .addEdge('parse_tool', 'approval')
    .addEdge('approval', 'execute')
    .addEdge('execute', END)

  return graph.compile({ checkpointer, interruptBefore: [] })
}
