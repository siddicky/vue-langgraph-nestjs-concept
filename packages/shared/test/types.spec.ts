import { describe, it, expect } from 'vitest';
import {
  TaskStatus,
  type Task,
  type PendingAction,
  type AgentState,
  type InterruptPayload,
  type StreamEvent,
  type StreamEventType,
} from '../src/index';

describe('Shared types', () => {
  describe('TaskStatus enum', () => {
    it('should have todo and done values', () => {
      expect(TaskStatus.todo).toBe('todo');
      expect(TaskStatus.done).toBe('done');
    });

    it('should only have two values', () => {
      const values = Object.values(TaskStatus);
      expect(values).toHaveLength(2);
      expect(values).toContain('todo');
      expect(values).toContain('done');
    });
  });

  describe('Task interface', () => {
    it('should accept valid task objects', () => {
      const task: Task = {
        id: 1,
        title: 'Test task',
        status: TaskStatus.todo,
      };
      expect(task.id).toBe(1);
      expect(task.title).toBe('Test task');
      expect(task.status).toBe(TaskStatus.todo);
    });
  });

  describe('PendingAction interface', () => {
    it('should accept addTask action', () => {
      const action: PendingAction = {
        tool: 'addTask',
        args: { title: 'New task' },
      };
      expect(action.tool).toBe('addTask');
    });

    it('should accept deleteTask action', () => {
      const action: PendingAction = {
        tool: 'deleteTask',
        args: { id: 1 },
      };
      expect(action.tool).toBe('deleteTask');
    });

    it('should accept setTaskStatus action', () => {
      const action: PendingAction = {
        tool: 'setTaskStatus',
        args: { id: 1, status: 'done' },
      };
      expect(action.tool).toBe('setTaskStatus');
    });

    it('should accept optional toolCallId', () => {
      const action: PendingAction = {
        tool: 'addTask',
        args: { title: 'New task' },
        toolCallId: 'call_123',
      };
      expect(action.toolCallId).toBe('call_123');
    });

    it('should work without toolCallId', () => {
      const action: PendingAction = {
        tool: 'deleteTask',
        args: { id: 1 },
      };
      expect(action.toolCallId).toBeUndefined();
    });
  });

  describe('AgentState interface', () => {
    it('should accept a valid agent state', () => {
      const state: AgentState = {
        messages: [{ role: 'user', content: 'Hello' }],
        tasks: [{ id: 1, title: 'Task', status: TaskStatus.todo }],
        pendingActions: [],
      };
      expect(state.messages).toHaveLength(1);
      expect(state.tasks).toHaveLength(1);
      expect(state.pendingActions).toEqual([]);
    });
  });

  describe('InterruptPayload interface', () => {
    it('should accept a valid interrupt payload', () => {
      const payload: InterruptPayload = {
        question: 'Delete task 1?',
        options: ['approve', 'reject'],
        pendingAction: { tool: 'deleteTask', args: { id: 1 } },
      };
      expect(payload.question).toContain('Delete');
      expect(payload.options).toHaveLength(2);
    });
  });

  describe('StreamEvent interface', () => {
    it('should accept all event types', () => {
      const types: StreamEventType[] = [
        'message_chunk',
        'state_update',
        'interrupt',
        'done',
        'error',
      ];

      types.forEach((type) => {
        const event: StreamEvent = { type, data: null };
        expect(event.type).toBe(type);
      });
    });
  });
});
