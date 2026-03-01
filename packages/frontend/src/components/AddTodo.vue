<script setup lang="ts">
import { ref } from 'vue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/stores/agent';

const store = useAgentStore();
const newTitle = ref('');

function handleAdd() {
  const title = newTitle.value.trim();
  if (!title) return;
  store.addTask(title);
  newTitle.value = '';
}
</script>

<template>
  <form @submit.prevent="handleAdd" class="flex gap-2">
    <Input
      v-model="newTitle"
      placeholder="Add a new task..."
      class="flex-1"
    />
    <Button type="submit" :disabled="!newTitle.trim()">Add</Button>
  </form>
</template>
