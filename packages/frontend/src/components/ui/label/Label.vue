<script setup lang="ts">
import { Label as LabelRoot } from 'radix-vue';
import { cn } from '@/lib/utils';

defineProps<{
  for?: string;
}>();
</script>

<template>
  <LabelRoot
    :for="$props.for"
    :class="cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70')"
  >
    <slot />
  </LabelRoot>
</template>
