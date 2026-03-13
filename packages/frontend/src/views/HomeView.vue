<script setup lang="ts">
import TasksList from '@/components/TasksList.vue';
import AgentChat from '@/components/AgentChat.vue';
</script>

<template>
  <main class="container mx-auto px-4 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-12rem)]">
      <div class="overflow-y-auto">
        <TasksList />
      </div>
      <AgentChat />
    </div>
  </main>
</template>
