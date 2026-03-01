<script setup lang="ts">
import TasksList from '@/components/TasksList.vue';
import AgentChat from '@/components/AgentChat.vue';
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b">
      <div class="container mx-auto px-4 py-4">
        <h1 class="text-3xl font-bold">Todos AI Agent</h1>
        <p class="text-muted-foreground">
          Vue.js + LangGraph.js + NestJS
        </p>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-12rem)]">
        <!-- Tasks Panel -->
        <div class="overflow-y-auto">
          <TasksList />
        </div>

        <!-- Chat Panel -->
        <AgentChat />
      </div>
    </main>
  </div>
</template>
