import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useStream } from '@langchain/vue';
import { Client } from '@langchain/langgraph-sdk';
import { defaultTasks } from '@/data/default-tasks';
import { TaskStatus, type Task, type PendingAction } from '@todos/shared';

interface GraphState {
  messages: any[];
  tasks: Task[];
  pendingActions: PendingAction[];
}

export const useAgentStore = defineStore('agent', () => {
  const currentThreadId = ref<string | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

  const client = new Client({ apiUrl });

  const stream = useStream<GraphState>({
    apiUrl,
    assistantId: 'agent',
    messagesKey: 'messages',
    fetchStateHistory: true,
    initialValues: {
      messages: [],
      tasks: [...defaultTasks],
      pendingActions: [],
    },
    onThreadId: (id: string) => {
      currentThreadId.value = id;
    },
  });

  // Local tasks ref for optimistic updates
  const localTasks = ref<Task[]>([...defaultTasks]);

  // Sync from stream when values change (stream is source of truth during streaming)
  watch(
    () => (stream.values.value as unknown as GraphState | undefined)?.tasks,
    (streamTasks) => {
      if (streamTasks && streamTasks.length > 0) {
        localTasks.value = streamTasks;
      }
    },
  );

  // Expose messages as BaseMessage[] from the composable
  const messages = stream.messages;

  const isLoading = stream.isLoading;

  // Interrupt from the stream
  const interrupt = stream.interrupt;

  // History for branching
  const history = stream.history;

  // Send a message to the agent
  function sendMessage(msg: string) {
    stream.submit(
      { messages: [{ type: 'human', content: msg }] as any[], tasks: localTasks.value, pendingActions: [] },
    );
  }

  // Resume after interrupt
  function resumeWithInput(response: string) {
    stream.submit(null, { command: { resume: response } });
  }

  // Local task CRUD with optimistic updates + backend sync
  function addTask(title: string) {
    const currentTasks = localTasks.value;
    const maxId = currentTasks.reduce((m, t) => Math.max(m, t.id), 0);
    const newTask: Task = { id: maxId + 1, title, status: TaskStatus.todo };
    localTasks.value = [...currentTasks, newTask];
    pushTasks(localTasks.value);
  }

  function deleteTask(id: number) {
    localTasks.value = localTasks.value.filter((t) => t.id !== id);
    pushTasks(localTasks.value);
  }

  function setTaskStatus(id: number, status: TaskStatus) {
    localTasks.value = localTasks.value.map((t) =>
      t.id === id ? { ...t, status } : t,
    );
    pushTasks(localTasks.value);
  }

  async function pushTasks(updatedTasks: Task[]) {
    if (!currentThreadId.value) return;
    await client.threads.updateState(currentThreadId.value, {
      values: { tasks: updatedTasks },
    });
  }

  return {
    // State
    threadId: currentThreadId,
    messages,
    tasks: localTasks,
    isLoading,
    interrupt,
    history,

    // Actions
    sendMessage,
    resumeWithInput,
    addTask,
    deleteTask,
    setTaskStatus,

    // Branching
    setBranch: stream.setBranch,
    getMessagesMetadata: stream.getMessagesMetadata,

    // Raw stream (for advanced usage)
    stream,
  };
});
