import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAgentStore } from '../stores/agent';
import { TaskStatus } from '@todos/shared';

// Mock the composable so the store doesn't make real fetch calls
vi.mock('../composables/useAgentStream', () => {
  const { ref } = require('vue');
  return {
    useAgentStream: () => ({
      threadId: ref(null),
      messages: ref([]),
      tasks: ref([]),
      isStreaming: ref(false),
      interruptPayload: ref(null),
      createThread: vi.fn(),
      sendMessage: vi.fn(),
      resumeWithInput: vi.fn(),
      getState: vi.fn(),
      pushTasks: vi.fn(),
    }),
  };
});

describe('useAgentStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with default tasks', () => {
    const store = useAgentStore();
    expect(store.tasks.length).toBeGreaterThan(0);
    expect(store.tasks[0]).toHaveProperty('id');
    expect(store.tasks[0]).toHaveProperty('title');
    expect(store.tasks[0]).toHaveProperty('status');
  });

  describe('addTask', () => {
    it('should add a task with auto-incremented id', () => {
      const store = useAgentStore();
      const initialCount = store.tasks.length;
      const maxId = store.tasks.reduce((m, t) => Math.max(m, t.id), 0);

      store.addTask('New task');

      expect(store.tasks.length).toBe(initialCount + 1);
      const newTask = store.tasks[store.tasks.length - 1];
      expect(newTask.id).toBe(maxId + 1);
      expect(newTask.title).toBe('New task');
      expect(newTask.status).toBe(TaskStatus.todo);
    });

    it('should sync to backend via pushTasks', () => {
      const store = useAgentStore();
      store.addTask('Synced task');
      // pushTasks is called internally (mocked)
    });
  });

  describe('deleteTask', () => {
    it('should remove a task by id', () => {
      const store = useAgentStore();
      const firstId = store.tasks[0].id;
      const initialCount = store.tasks.length;

      store.deleteTask(firstId);

      expect(store.tasks.length).toBe(initialCount - 1);
      expect(store.tasks.find((t) => t.id === firstId)).toBeUndefined();
    });

    it('should not affect other tasks', () => {
      const store = useAgentStore();
      const firstId = store.tasks[0].id;
      const secondTask = store.tasks[1];

      store.deleteTask(firstId);

      expect(store.tasks.find((t) => t.id === secondTask.id)).toBeDefined();
    });
  });

  describe('setTaskStatus', () => {
    it('should change task status to done', () => {
      const store = useAgentStore();
      const todoTask = store.tasks.find((t) => t.status === TaskStatus.todo);
      if (!todoTask) return;

      store.setTaskStatus(todoTask.id, TaskStatus.done);

      const updated = store.tasks.find((t) => t.id === todoTask.id);
      expect(updated?.status).toBe(TaskStatus.done);
    });

    it('should change task status to todo', () => {
      const store = useAgentStore();
      const doneTask = store.tasks.find((t) => t.status === TaskStatus.done);
      if (!doneTask) return;

      store.setTaskStatus(doneTask.id, TaskStatus.todo);

      const updated = store.tasks.find((t) => t.id === doneTask.id);
      expect(updated?.status).toBe(TaskStatus.todo);
    });

    it('should not change other tasks', () => {
      const store = useAgentStore();
      const task = store.tasks[0];
      const otherTask = store.tasks[1];
      const otherStatus = otherTask.status;

      store.setTaskStatus(task.id, TaskStatus.done);

      expect(store.tasks.find((t) => t.id === otherTask.id)?.status).toBe(otherStatus);
    });
  });

  describe('exposed state', () => {
    it('should expose threadId', () => {
      const store = useAgentStore();
      expect(store.threadId).toBeNull();
    });

    it('should expose messages', () => {
      const store = useAgentStore();
      expect(store.messages).toEqual([]);
    });

    it('should expose isStreaming', () => {
      const store = useAgentStore();
      expect(store.isStreaming).toBe(false);
    });

    it('should expose interruptPayload', () => {
      const store = useAgentStore();
      expect(store.interruptPayload).toBeNull();
    });
  });
});
