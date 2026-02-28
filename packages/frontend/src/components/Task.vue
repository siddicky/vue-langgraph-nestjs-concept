<template>
  <div class="flex items-center gap-3 py-3 px-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
    <input
      type="checkbox"
      :checked="task.status === TaskStatus.done"
      @change="handleStatusChange"
      class="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
    />
    <span
      class="flex-1 text-sm"
      :class="task.status === TaskStatus.done ? 'line-through text-gray-400' : 'text-gray-700'"
    >
      {{ task.title }}
    </span>
    <button
      @click="store.deleteTask(task.id)"
      class="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
      title="Delete task"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Task } from '@todos/shared'
import { TaskStatus } from '@todos/shared'
import { useAgentStore } from '../stores/agent'

const props = defineProps<{ task: Task }>()
const store = useAgentStore()

function handleStatusChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  store.setTaskStatus(props.task.id, checked ? TaskStatus.done : TaskStatus.todo)
}
</script>
