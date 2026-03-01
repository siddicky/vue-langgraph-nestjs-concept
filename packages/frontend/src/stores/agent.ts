import { defineStore } from 'pinia';
import { computed } from 'vue';
import { defaultTasks } from '@/data/default-tasks';
import { TaskStatus, type Task } from '@todos/shared';
import { useTodosState, pushTasks, resumeWithInput as resumeAgent } from '@/composables/useTodosLangGraphRuntime';

export const useAgentStore = defineStore('agent', () => {
  const { threadId, tasks, interrupt } = useTodosState();

  // Local task CRUD with optimistic updates + backend sync
  function addTask(title: string) {
    const currentTasks = tasks.value;
    const maxId = currentTasks.reduce((m, t) => Math.max(m, t.id), 0);
    const newTask: Task = { id: maxId + 1, title, status: TaskStatus.todo };
    pushTasks([...currentTasks, newTask]);
  }

  function deleteTask(id: number) {
    pushTasks(tasks.value.filter((t) => t.id !== id));
  }

  function setTaskStatus(id: number, status: TaskStatus) {
    pushTasks(tasks.value.map((t) =>
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
