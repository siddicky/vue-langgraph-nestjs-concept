<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-gray-900">AI Todos</h1>
        <span class="text-sm text-gray-500">Vue + LangGraph + NestJS</span>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex gap-6">
        <div class="flex-1">
          <AddTodo />
          <TasksList />
        </div>
      </div>
    </main>

    <AgentChat />
    <InterruptDialog />
  </div>
</template>

<script setup lang="ts">
import TasksList from './components/TasksList.vue'
import AddTodo from './components/AddTodo.vue'
import AgentChat from './components/AgentChat.vue'
import InterruptDialog from './components/InterruptDialog.vue'
</script>
