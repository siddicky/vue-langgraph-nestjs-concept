<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  open: boolean;
  title: string;
  description?: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const previouslyFocused = ref<HTMLElement | null>(null);

function handleOverlayClick() {
  emit('update:open', false);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('update:open', false);
    return;
  }
  if (event.key === 'Tab') {
    const el = dialogRef.value;
    if (!el) return;
    const focusable = Array.from(
      el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [contenteditable], summary, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((node) => !node.closest('[disabled]') && node.tabIndex >= 0);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first || document.activeElement === el) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
}

watch(
  () => props.open,
  async (val) => {
    if (val) {
      previouslyFocused.value = document.activeElement as HTMLElement;
      await nextTick();
      dialogRef.value?.focus();
    } else {
      previouslyFocused.value?.focus();
      previouslyFocused.value = null;
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50">
      <div
        class="fixed inset-0 bg-black/80"
        @click="handleOverlayClick"
      />
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        :aria-describedby="description ? 'dialog-description' : undefined"
        tabindex="-1"
        :class="
          cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg focus:outline-none',
          )
        "
        @keydown="handleKeydown"
      >
        <div class="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 id="dialog-title" class="text-lg font-semibold leading-none tracking-tight">
            {{ title }}
          </h2>
          <p v-if="description" id="dialog-description" class="text-sm text-muted-foreground">
            {{ description }}
          </p>
        </div>
        <slot />
        <button
          type="button"
          aria-label="Close"
          class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          @click="emit('update:open', false)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>
