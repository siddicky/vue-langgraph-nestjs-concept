import { defineStore } from 'pinia';
import { useAgentStream } from '@/composables/useAgentStream';
import { defaultTasks } from '@/data/default-tasks';
import { TaskStatus, type Task } from '@todos/shared';

export const useAgentStore = defineStore('agent', () => {
  const stream = useAgentStream();

  // Initialize with default tasks, then eagerly create thread and sync them to backend
  stream.tasks.value = [...defaultTasks];
  stream.createThread().then(() => {
    stream.pushTasks(stream.tasks.value);
  }).catch(console.error);

  function addTask(title: string) {
    const maxId = stream.tasks.value.reduce((m, t) => Math.max(m, t.id), 0);
    const newTask: Task = { id: maxId + 1, title, status: TaskStatus.todo };
    stream.tasks.value = [...stream.tasks.value, newTask];
    stream.pushTasks(stream.tasks.value);
  }

  function deleteTask(id: number) {
    stream.tasks.value = stream.tasks.value.filter((t) => t.id !== id);
    stream.pushTasks(stream.tasks.value);
  }

  function setTaskStatus(id: number, status: TaskStatus) {
    stream.tasks.value = stream.tasks.value.map((t) =>
      t.id === id ? { ...t, status } : t,
    );
    stream.pushTasks(stream.tasks.value);
  }

  return {
    // State
    threadId: stream.threadId,
    messages: stream.messages,
    tasks: stream.tasks,
    isStreaming: stream.isStreaming,
    interruptPayload: stream.interruptPayload,

    // Actions
    sendMessage: stream.sendMessage,
    resumeWithInput: stream.resumeWithInput,
    addTask,
    deleteTask,
    setTaskStatus,
  };
});
