import { ref, computed } from 'vue';
import { useLangGraphRuntime } from '@assistant-ui/vue-langgraph';
import type { LangChainMessage, LangGraphInterruptState } from '@assistant-ui/vue-langgraph';
import { createThread, sendMessage, resumeThread, updateThreadState } from '@/lib/chatApi';
import { defaultTasks } from '@/data/default-tasks';
import type { Task } from '@todos/shared';

const threadId = ref<string | null>(null);
const tasks = ref<Task[]>([...defaultTasks]);
const interruptState = ref<LangGraphInterruptState | undefined>(undefined);

async function ensureThread(): Promise<string> {
  if (!threadId.value) {
    const thread = await createThread();
    threadId.value = thread.thread_id;
  }
  return threadId.value;
}

export function useTodosLangGraphRuntime() {
  const runtime = useLangGraphRuntime({
    stream: async (messages: LangChainMessage[]) => {
      const id = await ensureThread();

      const generator = sendMessage({
        threadId: id,
        messages,
        tasks: tasks.value,
      });

      for await (const chunk of generator) {
        // Intercept values events to sync tasks
        if (chunk.event === 'values' && chunk.data?.tasks) {
          tasks.value = chunk.data.tasks;
        }
        // Track interrupt state from updates events
        if (chunk.event === 'updates' && chunk.data?.__interrupt__?.[0]) {
          interruptState.value = chunk.data.__interrupt__[0];
        }
      }
    },
  });

  return runtime;
}

export function useTodosState() {
  return {
    threadId: computed(() => threadId.value),
    tasks,
    interrupt: computed(() => interruptState.value),
  };
}

export async function pushTasks(updatedTasks: Task[]) {
  tasks.value = updatedTasks;
  if (!threadId.value) return;
  await updateThreadState(threadId.value, { tasks: updatedTasks });
}

export async function resumeWithInput(response: string) {
  if (!threadId.value) return;
  interruptState.value = undefined;

  const generator = resumeThread({
    threadId: threadId.value,
    response,
  });

  for await (const chunk of generator) {
    if (chunk.event === 'values' && chunk.data?.tasks) {
      tasks.value = chunk.data.tasks;
    }
  }
}
