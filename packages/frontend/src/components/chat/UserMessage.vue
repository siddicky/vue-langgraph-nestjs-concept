<script setup lang="ts">
import { MessageRoot, MessageParts } from '@assistant-ui/vue';
</script>

<template>
  <MessageRoot class="flex justify-end py-2">
    <div class="max-w-[80%] rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
      <MessageParts />
    </div>
  </MessageRoot>
</template>
