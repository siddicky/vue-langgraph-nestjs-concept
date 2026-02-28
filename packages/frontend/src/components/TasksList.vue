<script setup lang="ts">
import { computed } from 'vue';
import { useAgentStore } from '@/stores/agent';
import TaskItem from './Task.vue';
import AddTodo from './AddTodo.vue';

const store = useAgentStore();
const tasks = computed(() => store.tasks);
</script>

<template>
  <div class="flex flex-col gap-4">
    <h2 class="text-2xl font-bold">Tasks</h2>
    <AddTodo />
    <TransitionGroup
      name="task"
      tag="div"
      class="flex flex-col gap-2"
    >
      <TaskItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
      />
    </TransitionGroup>
    <p v-if="tasks.length === 0" class="text-muted-foreground text-center py-8">
      No tasks yet. Add one above or ask the AI assistant!
    </p>
  </div>
</template>

<style scoped>
.task-enter-active,
.task-leave-active {
  transition: all 0.3s ease;
}

.task-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.task-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.task-move {
  transition: transform 0.3s ease;
}
</style>
