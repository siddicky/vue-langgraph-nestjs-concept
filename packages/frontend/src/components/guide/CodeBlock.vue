<script setup lang="ts">
defineProps<{
  code: string;
  language?: string;
  title?: string;
}>();
</script>

<template>
  <div class="rounded-lg border border-border overflow-hidden my-4">
    <div v-if="title" class="bg-muted px-4 py-2 text-sm font-mono text-muted-foreground border-b border-border">
      {{ title }}
    </div>
    <pre class="bg-card p-4 overflow-x-auto text-sm leading-relaxed"><code class="font-mono text-foreground">{{ code }}</code></pre>
  </div>
</template>
