/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { TaskStatus } from '@todos/shared';

const addTaskSchema = z.object({
  title: z.string().describe('The title of the task'),
});

const deleteTaskSchema = z.object({
  id: z.number().describe('The id of the task'),
});

const setTaskStatusSchema = z.object({
  id: z.number().describe('The id of the task'),
  status: z.nativeEnum(TaskStatus).describe('The new status'),
});

export const addTaskTool = new DynamicStructuredTool({
  name: 'addTask',
  description: 'Adds a task to the todo list',
  schema: addTaskSchema as any,
  func: async (input: any) => {
    return JSON.stringify({ tool: 'addTask', args: { title: input.title } });
  },
});

export const deleteTaskTool = new DynamicStructuredTool({
  name: 'deleteTask',
  description: 'Deletes a task from the todo list',
  schema: deleteTaskSchema as any,
  func: async (input: any) => {
    return JSON.stringify({ tool: 'deleteTask', args: { id: input.id } });
  },
});

export const setTaskStatusTool = new DynamicStructuredTool({
  name: 'setTaskStatus',
  description: 'Sets the status of a task',
  schema: setTaskStatusSchema as any,
  func: async (input: any) => {
    return JSON.stringify({
      tool: 'setTaskStatus',
      args: { id: input.id, status: input.status },
    });
  },
});

export const allTools = [addTaskTool, deleteTaskTool, setTaskStatusTool];
