<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  icon?: string;
}>();
</script>

<template>
  <div class="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors">
    <div class="flex items-start gap-3">
      <span v-if="icon" class="text-2xl mt-0.5">{{ icon }}</span>
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-semibold text-foreground">{{ title }}</h3>
        <p v-if="description" class="text-sm text-muted-foreground mt-1">{{ description }}</p>
        <div class="mt-4">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
