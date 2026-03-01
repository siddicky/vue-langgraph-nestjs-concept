<script setup lang="ts">
import {
  ThreadRoot,
  ThreadViewport,
  ThreadMessages,
  ThreadEmpty,
  ThreadIf,
  ComposerRoot,
  ComposerInput,
  ComposerSend,
} from '@assistant-ui/vue';
import UserMessage from './UserMessage.vue';
import AssistantMessage from './AssistantMessage.vue';
</script>

<template>
  <ThreadRoot class="flex h-full flex-col border rounded-lg">
    <!-- Header -->
    <div class="p-4 border-b">
      <h2 class="text-lg font-semibold">AI Assistant</h2>
      <p class="text-sm text-muted-foreground">Ask me to manage your tasks</p>
    </div>

    <!-- Messages viewport -->
    <ThreadViewport class="flex-1 flex flex-col p-4 space-y-1">
      <ThreadEmpty>
        <div class="text-center text-muted-foreground text-sm py-8">
          Try: "Add a task to buy milk" or "Mark task 1 as done"
        </div>
      </ThreadEmpty>

      <ThreadMessages
        :components="{
          UserMessage,
          AssistantMessage,
        }"
      />

      <!-- Loading indicator -->
      <ThreadIf :running="true">
        <div class="flex items-center gap-2 text-muted-foreground text-sm py-2">
          <span class="animate-pulse">Thinking...</span>
        </div>
      </ThreadIf>
    </ThreadViewport>

    <!-- Composer -->
    <ComposerRoot class="p-4 border-t flex gap-2">
      <ComposerInput
        placeholder="Type a message..."
        :auto-focus="false"
        :submit-on-enter="true"
        class="flex-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
      />
      <ComposerSend
        class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      >
        Send
      </ComposerSend>
    </ComposerRoot>
  </ThreadRoot>
</template>
