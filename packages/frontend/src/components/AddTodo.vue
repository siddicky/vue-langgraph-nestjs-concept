<template>
  <div class="flex gap-2 mb-4">
    <input
      v-model="newTaskTitle"
      @keyup.enter="handleAdd"
      type="text"
      placeholder="Add a new task..."
      class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <button
      @click="handleAdd"
      :disabled="!newTaskTitle.trim()"
      class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      Add
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAgentStore } from '../stores/agent'

const store = useAgentStore()
const newTaskTitle = ref('')

async function handleAdd() {
  const title = newTaskTitle.value.trim()
  if (!title) return
  await store.addTask(title)
  newTaskTitle.value = ''
}
</script>
