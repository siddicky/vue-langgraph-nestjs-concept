<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{
  checked?: boolean;
  disabled?: boolean;
  id?: string;
}>();

const emit = defineEmits<{
  'update:checked': [value: boolean];
}>();

function toggle() {
  if (!props.disabled) {
    emit('update:checked', !props.checked);
  }
}
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="checked ?? false"
    :disabled="disabled"
    :id="id"
    :class="
      cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary text-primary-foreground' : '',
      )
    "
    @click="toggle"
  >
    <span v-if="checked" class="flex items-center justify-center text-current">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  </button>
</template>
