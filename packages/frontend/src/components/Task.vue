<script setup lang="ts">
import { TaskStatus, type Task } from '@todos/shared';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/stores/agent';

const props = defineProps<{ task: Task }>();
const store = useAgentStore();

function toggleStatus() {
  const newStatus =
    props.task.status === TaskStatus.done ? TaskStatus.todo : TaskStatus.done;
  store.setTaskStatus(props.task.id, newStatus);
}

function handleDelete() {
  store.deleteTask(props.task.id);
}
</script>

<template>
  <div class="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
    <Checkbox
      :id="`task-${task.id}`"
      :checked="task.status === TaskStatus.done"
      @update:checked="toggleStatus"
    />
    <Label
      :for="`task-${task.id}`"
      class="flex-1 cursor-pointer"
      :class="{ 'line-through text-muted-foreground': task.status === TaskStatus.done }"
    >
      {{ task.title }}
    </Label>
    <Button variant="ghost" size="icon" @click="handleDelete" class="h-8 w-8 text-muted-foreground hover:text-destructive">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </svg>
    </Button>
  </div>
</template>
