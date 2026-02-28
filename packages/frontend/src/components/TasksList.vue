<template>
  <div class="mt-4">
    <TransitionGroup
      tag="div"
      name="task-list"
      class="flex flex-col gap-2"
    >
      <Task
        v-for="task in sortedTasks"
        :key="task.id"
        :task="task"
      />
    </TransitionGroup>
    <p v-if="store.tasks.length === 0" class="text-center text-gray-400 py-8 text-sm">
      No tasks yet. Add one above or ask the AI assistant!
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Task from './Task.vue'
import { useAgentStore } from '../stores/agent'
import { TaskStatus } from '@todos/shared'

const store = useAgentStore()

const sortedTasks = computed(() => {
  return [...store.tasks].sort((a, b) => {
    if (a.status === TaskStatus.done && b.status !== TaskStatus.done) return 1
    if (a.status !== TaskStatus.done && b.status === TaskStatus.done) return -1
    return a.id - b.id
  })
})
</script>

<style scoped>
.task-list-enter-active,
.task-list-leave-active {
  transition: all 0.3s ease;
}
.task-list-enter-from,
.task-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
