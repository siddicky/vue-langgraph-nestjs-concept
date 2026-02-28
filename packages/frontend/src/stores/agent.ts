import { defineStore } from 'pinia'
import { useAgentStream } from '../composables/useAgentStream'
import type { Task } from '@todos/shared'
import { TaskStatus } from '@todos/shared'

export const useAgentStore = defineStore('agent', () => {
  const stream = useAgentStream()

  async function addTask(title: string) {
    const currentTasks = stream.tasks.value
    const maxId = currentTasks.length > 0 ? Math.max(...currentTasks.map((t) => t.id)) : 0
    const newTask: Task = {
      id: maxId + 1,
      title,
      status: TaskStatus.todo,
    }
    stream.tasks.value = [...currentTasks, newTask]
    await stream.pushTasks(stream.tasks.value)
  }

  async function deleteTask(id: number) {
    stream.tasks.value = stream.tasks.value.filter((t) => t.id !== id)
    await stream.pushTasks(stream.tasks.value)
  }

  async function setTaskStatus(id: number, status: TaskStatus) {
    stream.tasks.value = stream.tasks.value.map((t) => (t.id === id ? { ...t, status } : t))
    await stream.pushTasks(stream.tasks.value)
  }

  return {
    // state
    threadId: stream.threadId,
    messages: stream.messages,
    tasks: stream.tasks,
    isStreaming: stream.isStreaming,
    interruptPayload: stream.interruptPayload,
    error: stream.error,
    // actions from composable
    createThread: stream.createThread,
    sendMessage: stream.sendMessage,
    resumeWithInput: stream.resumeWithInput,
    getState: stream.getState,
    pushTasks: stream.pushTasks,
    // local actions
    addTask,
    deleteTask,
    setTaskStatus,
  }
})
