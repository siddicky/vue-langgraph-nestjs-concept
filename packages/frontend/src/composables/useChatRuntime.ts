import { reactive, ref } from 'vue';
import {
  useExternalStoreRuntime,
  useExternalMessageConverter,
  type AppendMessage,
  type ExternalStoreAdapter,
} from '@assistant-ui/vue';
import { convertLangChainMessages } from '@assistant-ui/vue-langgraph';
import type { LangChainMessage } from '@assistant-ui/vue-langgraph';
import { Client } from '@langchain/langgraph-sdk';
import { defaultTasks } from '@/data/default-tasks';
import { TaskStatus, type Task, type PendingAction } from '@todos/shared';

const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

export function useChatRuntime() {
  const client = new Client({ apiUrl });

  // --- Reactive state ---
  const messages = ref<LangChainMessage[]>([]);
  const isRunning = ref(false);
  const threadId = ref<string | null>(null);
  const localTasks = ref<Task[]>([...defaultTasks]);
  const interruptPayload = ref<{
    question: string;
    options: string[];
    pendingAction: PendingAction;
  } | null>(null);

  // --- Message conversion (LangChain → assistant-ui format) ---
  // @ts-expect-error - deep type instantiation from assistant-ui generics
  const threadMessages = useExternalMessageConverter({
    callback: convertLangChainMessages,
    messages: messages,
    isRunning: isRunning,
    joinStrategy: 'concat-content',
  });

  // --- Stream processing ---
  async function processStream(stream: AsyncIterable<any>) {
    for await (const event of stream) {
      if (event.event === 'values') {
        const data = event.data;
        if (data.messages) {
          messages.value = data.messages;
        }
        if (data.tasks) {
          localTasks.value = data.tasks;
        }
      }
    }

    // After stream completes, fetch final state (handles interrupts + sync)
    if (threadId.value) {
      const state = await client.threads.getState(threadId.value);
      if (state.values) {
        const vals = state.values as {
          messages?: LangChainMessage[];
          tasks?: Task[];
        };
        if (vals.messages) {
          messages.value = vals.messages;
        }
        if (vals.tasks) {
          localTasks.value = vals.tasks;
        }
      }
      // Check for interrupts
      const stateTasks = (state as any).tasks;
      if (stateTasks?.[0]?.interrupts?.length > 0) {
        interruptPayload.value = stateTasks[0].interrupts[0].value;
      } else {
        interruptPayload.value = null;
      }
    }
  }

  // --- onNew handler: user sends a chat message ---
  async function onNew(message: AppendMessage) {
    if (message.role !== 'user') {
      throw new Error('Only user messages can be appended.');
    }

    const text = message.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    if (!text.trim()) return;

    // Create thread on first message
    if (!threadId.value) {
      const thread = await client.threads.create();
      threadId.value = thread.thread_id;
    }

    // Optimistic: add user message locally
    const newMsg: LangChainMessage = { type: 'human', content: text };
    messages.value = [...messages.value, newMsg];

    isRunning.value = true;
    try {
      const stream = client.runs.stream(threadId.value!, 'agent', {
        input: {
          messages: [{ type: 'human', content: text }],
          tasks: localTasks.value,
          pendingActions: [],
        },
        streamMode: ['values'],
      });
      await processStream(stream);
    } finally {
      isRunning.value = false;
    }
  }

  // --- Resume after interrupt ---
  async function resumeWithInput(response: string) {
    if (!threadId.value) return;
    interruptPayload.value = null;
    isRunning.value = true;

    try {
      const stream = client.runs.stream(threadId.value, 'agent', {
        command: { resume: response },
        streamMode: ['values'],
      });
      await processStream(stream);
    } finally {
      isRunning.value = false;
    }
  }

  // --- Task CRUD (optimistic updates + backend sync) ---
  function addTask(title: string) {
    const maxId = localTasks.value.reduce((m, t) => Math.max(m, t.id), 0);
    const newTask: Task = { id: maxId + 1, title, status: TaskStatus.todo };
    localTasks.value = [...localTasks.value, newTask];
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
    if (!threadId.value) return;
    await client.threads.updateState(threadId.value, {
      values: { tasks: updatedTasks },
    });
  }

  // --- Build the external store runtime ---
  // Use a reactive adapter with getters so the watchEffect inside
  // useExternalStoreRuntime re-triggers when isRunning/messages change.
  const adapter = reactive({
    get isRunning() {
      return isRunning.value;
    },
    get messages() {
      return threadMessages.value;
    },
    onNew,
  }) as any as ExternalStoreAdapter;

  const runtime = useExternalStoreRuntime(adapter);

  return {
    runtime,
    tasks: localTasks,
    threadId,
    interruptPayload,
    addTask,
    deleteTask,
    setTaskStatus,
    resumeWithInput,
  };
}
