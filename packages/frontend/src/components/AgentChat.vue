<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/stores/agent';
import InterruptDialog from './InterruptDialog.vue';

const store = useAgentStore();
const userInput = ref('');
const chatContainer = ref<HTMLElement | null>(null);

async function handleSend() {
  const msg = userInput.value.trim();
  if (!msg || store.isStreaming) return;
  userInput.value = '';
  await store.sendMessage(msg);
}

// Auto-scroll to bottom on new messages
watch(
  () => store.messages.length,
  async () => {
    await nextTick();
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  },
);
</script>

<template>
  <div class="flex flex-col h-full border rounded-lg">
    <div class="p-4 border-b">
      <h2 class="text-lg font-semibold">AI Assistant</h2>
      <p class="text-sm text-muted-foreground">Ask me to manage your tasks</p>
    </div>

    <!-- Messages -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
      <div
        v-for="(msg, i) in store.messages"
        :key="i"
        :class="[
          'max-w-[80%] rounded-lg px-4 py-2 text-sm',
          msg.role === 'human'
            ? 'ml-auto bg-primary text-primary-foreground'
            : 'bg-muted',
        ]"
      >
        {{ msg.content }}
      </div>

      <div v-if="store.isStreaming" class="flex items-center gap-2 text-muted-foreground text-sm">
        <span class="animate-pulse">Thinking...</span>
      </div>

      <div v-if="store.messages.length === 0" class="text-center text-muted-foreground text-sm py-8">
        Try: "Add a task to buy milk" or "Mark task 1 as done"
      </div>
    </div>

    <!-- Input -->
    <form @submit.prevent="handleSend" class="p-4 border-t flex gap-2">
      <Input
        v-model="userInput"
        placeholder="Type a message..."
        :disabled="store.isStreaming"
        class="flex-1"
      />
      <Button type="submit" :disabled="store.isStreaming || !userInput.trim()">
        Send
      </Button>
    </form>

    <!-- Interrupt Dialog -->
    <InterruptDialog />
  </div>
</template>
