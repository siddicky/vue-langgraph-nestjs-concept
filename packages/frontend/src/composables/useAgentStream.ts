import { ref } from 'vue';
import type { Task, StreamEvent, InterruptPayload } from '@todos/shared';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useAgentStream() {
  const threadId = ref<string | null>(null);
  const messages = ref<Array<{ role: string; content: string }>>([]);
  const tasks = ref<Task[]>([]);
  const isStreaming = ref(false);
  const interruptPayload = ref<InterruptPayload | null>(null);

  async function createThread() {
    const res = await fetch(`${API_BASE}/agent/thread`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to create thread: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (!data.threadId) {
      throw new Error('Server response missing threadId');
    }
    threadId.value = data.threadId;
  }

  async function consumeStream(res: Response) {
    if (!res.ok) {
      throw new Error(`Stream request failed: ${res.status} ${res.statusText}`);
    }
    if (!res.body) {
      throw new Error('Response body is null');
    }
    isStreaming.value = true;
    interruptPayload.value = null;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: StreamEvent = JSON.parse(line.slice(6));

            switch (event.type) {
              case 'message_chunk':
                messages.value = [...messages.value, event.data];
                break;
              case 'state_update':
                if (event.data.tasks) tasks.value = event.data.tasks;
                break;
              case 'interrupt':
                interruptPayload.value = event.data;
                break;
              case 'error':
                console.error('Stream error:', event.data);
                break;
              case 'done':
                break;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } finally {
      isStreaming.value = false;
    }
  }

  async function sendMessage(userInput: string) {
    if (!threadId.value) await createThread();
    messages.value = [...messages.value, { role: 'human', content: userInput }];

    const res = await fetch(`${API_BASE}/agent/${threadId.value}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userInput }),
    });
    await consumeStream(res);
  }

  async function resumeWithInput(response: string) {
    if (!threadId.value) return;
    const res = await fetch(`${API_BASE}/agent/${threadId.value}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    });
    await consumeStream(res);
  }

  async function getState() {
    if (!threadId.value) return;
    const res = await fetch(`${API_BASE}/agent/${threadId.value}/state`);
    const state = await res.json();
    if (state.tasks) tasks.value = state.tasks;
    return state;
  }

  async function pushTasks(updatedTasks: Task[]) {
    if (!threadId.value) return;
    await fetch(`${API_BASE}/agent/${threadId.value}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: updatedTasks }),
    });
  }

  return {
    threadId,
    messages,
    tasks,
    isStreaming,
    interruptPayload,
    createThread,
    sendMessage,
    resumeWithInput,
    getState,
    pushTasks,
  };
}
