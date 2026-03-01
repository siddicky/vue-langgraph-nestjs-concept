import { defineStore } from 'pinia';
import { useChatRuntime } from '@/composables/useChatRuntime';

export const useAgentStore = defineStore('agent', () => {
  const {
    runtime,
    tasks,
    threadId,
    interruptPayload,
    addTask,
    deleteTask,
    setTaskStatus,
    resumeWithInput,
  } = useChatRuntime();

  return {
    // assistant-ui runtime (used by AssistantRuntimeProvider)
    runtime,

    // Task state (used by TasksList, AddTodo, Task components)
    tasks,
    threadId,

    // Interrupt state (used by InterruptDialog)
    interruptPayload,

    // Task actions
    addTask,
    deleteTask,
    setTaskStatus,

    // Interrupt action
    resumeWithInput,
  };
});
