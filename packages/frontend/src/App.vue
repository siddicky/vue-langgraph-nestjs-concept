<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">
            <router-link to="/" class="hover:text-primary transition-colors">
              Todos AI Agent
            </router-link>
          </h1>
          <p class="text-muted-foreground">
            Vue.js + LangGraph.js + NestJS
          </p>
        </div>
        <nav class="flex items-center gap-4">
          <router-link
            to="/"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              route.name === 'home'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            ]"
          >
            App
          </router-link>
          <router-link
            to="/guide"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              route.name === 'guide'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            ]"
          >
            Vue Guide
          </router-link>
        </nav>
      </div>
    </header>

    <router-view />
  </div>
</template>
