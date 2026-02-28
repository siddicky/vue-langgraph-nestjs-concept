import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { TaskStatus } from '@todos/shared'

export const addTaskTool = tool(
  async ({ title }: { title: string }) => {
    return JSON.stringify({ action: 'addTask', title })
  },
  {
    name: 'addTask',
    description: 'Add a new task to the todo list',
    schema: z.object({
      title: z.string().describe('The title of the task to add'),
    }),
  },
)

export const deleteTaskTool = tool(
  async ({ id }: { id: number }) => {
    return JSON.stringify({ action: 'deleteTask', id })
  },
  {
    name: 'deleteTask',
    description: 'Delete a task from the todo list by its ID',
    schema: z.object({
      id: z.number().describe('The ID of the task to delete'),
    }),
  },
)

export const setTaskStatusTool = tool(
  async ({ id, status }: { id: number; status: TaskStatus }) => {
    return JSON.stringify({ action: 'setTaskStatus', id, status })
  },
  {
    name: 'setTaskStatus',
    description: 'Set the status of a task (todo or done)',
    schema: z.object({
      id: z.number().describe('The ID of the task'),
      status: z.nativeEnum(TaskStatus).describe('The new status of the task'),
    }),
  },
)

export const agentTools = [addTaskTool, deleteTaskTool, setTaskStatusTool]
