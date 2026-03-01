<script setup lang="ts">
import { MessageRoot, MessageParts } from '@assistant-ui/vue';
</script>

<template>
  <MessageRoot class="flex justify-start py-2">
    <div class="max-w-[80%] rounded-lg bg-muted px-4 py-2 text-sm">
      <MessageParts />
    </div>
  </MessageRoot>
</template>
