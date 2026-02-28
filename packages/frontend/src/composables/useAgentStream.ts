import { ref } from 'vue'
import type { Task, InterruptPayload, StreamEvent } from '@todos/shared'
import { defaultTasks } from '../data/default-tasks'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function useAgentStream() {
  const threadId = ref<string | null>(null)
  const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const tasks = ref<Task[]>([...defaultTasks])
  const isStreaming = ref(false)
  const interruptPayload = ref<InterruptPayload | null>(null)
  const error = ref<string | null>(null)

  async function createThread(): Promise<string> {
    const res = await fetch(`${API_URL}/agent/thread`, { method: 'POST' })
    const data = await res.json()
    threadId.value = data.threadId
    return data.threadId
  }

  async function consumeSSEStream(response: Response) {
    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue
          try {
            const event: StreamEvent = JSON.parse(jsonStr)
            handleStreamEvent(event)
          } catch {
            // ignore parse errors
          }
        }
      }
    }
  }

  function handleStreamEvent(event: StreamEvent) {
    switch (event.type) {
      case 'message_chunk':
        if (event.data?.content) {
          const last = messages.value[messages.value.length - 1]
          if (last?.role === 'assistant') {
            messages.value[messages.value.length - 1] = {
              ...last,
              content: last.content + event.data.content,
            }
          } else {
            messages.value = [...messages.value, { role: 'assistant', content: event.data.content }]
          }
        }
        break
      case 'state_update':
        if (event.data?.tasks) {
          tasks.value = event.data.tasks
        }
        break
      case 'interrupt':
        interruptPayload.value = event.data
        break
      case 'done':
        isStreaming.value = false
        break
      case 'error':
        error.value = event.data?.message || 'An error occurred'
        isStreaming.value = false
        break
    }
  }

  async function sendMessage(input: string) {
    if (!threadId.value) {
      await createThread()
    }

    messages.value = [...messages.value, { role: 'user', content: input }]
    isStreaming.value = true
    interruptPayload.value = null
    error.value = null

    try {
      const response = await fetch(`${API_URL}/agent/${threadId.value}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })
      await consumeSSEStream(response)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to send message'
      isStreaming.value = false
    }
  }

  async function resumeWithInput(response: string) {
    if (!threadId.value) return

    isStreaming.value = true
    interruptPayload.value = null

    try {
      const res = await fetch(`${API_URL}/agent/${threadId.value}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      await consumeSSEStream(res)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to resume'
      isStreaming.value = false
    }
  }

  async function getState() {
    if (!threadId.value) return null
    const res = await fetch(`${API_URL}/agent/${threadId.value}/state`)
    return res.json()
  }

  async function pushTasks(updatedTasks: Task[]) {
    if (!threadId.value) return
    await fetch(`${API_URL}/agent/${threadId.value}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: updatedTasks }),
    })
  }

  return {
    threadId,
    messages,
    tasks,
    isStreaming,
    interruptPayload,
    error,
    createThread,
    sendMessage,
    resumeWithInput,
    getState,
    pushTasks,
  }
}
