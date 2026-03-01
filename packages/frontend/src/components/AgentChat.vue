<script setup lang="ts">
import {
  ThreadRoot,
  ThreadViewport,
  ThreadMessages,
  ThreadIf,
  ThreadEmpty,
  ComposerRoot,
  ComposerInput,
  ComposerSend,
  ComposerCancel,
  MessageRoot,
  MessageParts,
} from '@assistant-ui/vue';
import InterruptDialog from './InterruptDialog.vue';

const UserMessage = {
  template: `
    <MessageRoot class="grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4 [&:where(>*)]:col-start-2">
      <div class="bg-primary text-primary-foreground col-start-2 row-start-1 max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5">
        <MessageParts />
      </div>
    </MessageRoot>
  `,
  components: { MessageRoot, MessageParts },
};

const AssistantMessage = {
  template: `
    <MessageRoot class="relative grid w-full max-w-[var(--thread-max-width)] grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4">
      <div class="text-foreground col-span-2 col-start-2 row-start-1 my-1.5 max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7">
        <MessageParts />
      </div>
    </MessageRoot>
  `,
  components: { MessageRoot, MessageParts },
};
</script>

<template>
  <div class="flex flex-col h-full border rounded-lg">
    <div class="p-4 border-b">
      <h2 class="text-lg font-semibold">AI Assistant</h2>
      <p class="text-sm text-muted-foreground">Ask me to manage your tasks</p>
    </div>

    <ThreadRoot
      class="flex-1 flex flex-col overflow-hidden"
      :style="{ '--thread-max-width': '100%' }"
    >
      <ThreadViewport class="flex-1 flex flex-col items-center overflow-y-auto scroll-smooth px-4 pt-4">
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

        <ThreadIf :empty="false">
          <div class="min-h-8 flex-grow" />
        </ThreadIf>

        <div class="sticky bottom-0 mt-3 flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end rounded-t-lg bg-inherit pb-4">
          <ComposerRoot class="focus-within:border-ring/20 flex w-full flex-wrap items-end rounded-lg border bg-inherit px-2.5 shadow-sm transition-colors ease-in">
            <ComposerInput
              :rows="1"
              :auto-focus="true"
              placeholder="Type a message..."
              class="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
            />
            <ThreadIf :running="false">
              <ComposerSend
                class="my-2.5 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-8 px-3 transition-colors hover:bg-primary/90"
              >
                Send
              </ComposerSend>
            </ThreadIf>
            <ThreadIf :running="true">
              <ComposerCancel
                class="my-2.5 inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground text-sm font-medium h-8 px-3 transition-colors hover:bg-destructive/90"
              >
                Stop
              </ComposerCancel>
            </ThreadIf>
          </ComposerRoot>
        </div>
      </ThreadViewport>
    </ThreadRoot>

    <!-- Interrupt Dialog -->
    <InterruptDialog />
  </div>
</template>
