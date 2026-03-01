import { defineStore } from 'pinia';
import { defaultTasks } from '@/data/default-tasks';
import { TaskStatus, type Task } from '@todos/shared';
import { useTodosState, pushTasks, resumeWithInput as resumeAgent } from '@/composables/useTodosLangGraphRuntime';

export const useAgentStore = defineStore('agent', () => {
  const { threadId, tasks, interrupt } = useTodosState();

  // Local task CRUD with optimistic updates + backend sync
  async function addTask(title: string) {
    const currentTasks = tasks.value;
    const maxId = currentTasks.reduce((m, t) => Math.max(m, t.id), 0);
    const newTask: Task = { id: maxId + 1, title, status: TaskStatus.todo };
    await pushTasks([...currentTasks, newTask]);
  }

  async function deleteTask(id: number) {
    await pushTasks(tasks.value.filter((t) => t.id !== id));
  }

  async function setTaskStatus(id: number, status: TaskStatus) {
    await pushTasks(tasks.value.map((t) =>
      t.id === id ? { ...t, status } : t,
    ));
  }

  function resumeWithInput(response: string) {
    resumeAgent(response);
  }

  return {
    // State
    threadId,
    tasks,
    interrupt,

    // Actions
    addTask,
    deleteTask,
    setTaskStatus,
    resumeWithInput,
  };
});
