<script setup lang="ts">
defineProps<{
  activeSection: string;
  sections: Array<{ id: string; label: string; icon: string }>;
}>();

defineEmits<{
  navigate: [sectionId: string];
}>();
</script>

<template>
  <nav class="space-y-1">
    <button
      v-for="section in sections"
      :key="section.id"
      :class="[
        'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
        activeSection === section.id
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      ]"
      @click="$emit('navigate', section.id)"
    >
      <span>{{ section.icon }}</span>
      <span>{{ section.label }}</span>
    </button>
  </nav>
</template>
