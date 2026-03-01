<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/stores/agent';
import InterruptDialog from './InterruptDialog.vue';

const store = useAgentStore();
const userInput = ref('');
const chatContainer = ref<HTMLElement | null>(null);

const displayMessages = computed(() =>
  store.messages.filter((msg: any) => {
    const type = msg?.type ?? msg?._getType?.();
    return type === 'human' || type === 'ai';
  }),
);

function getMessageType(msg: any): string {
  return msg?.type ?? msg?._getType?.() ?? 'unknown';
}

function getMessageContent(msg: any): string {
  const content = msg?.content ?? '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('');
  }
  return String(content);
}

function getBranchOptions(msg: any, index: number): string[] | undefined {
  const meta = store.getMessagesMetadata(msg, index);
  return meta?.branchOptions;
}

function getCurrentBranch(msg: any, index: number): string | undefined {
  const meta = store.getMessagesMetadata(msg, index);
  return meta?.branch;
}

function switchBranch(msg: any, index: number, direction: 'prev' | 'next') {
  const options = getBranchOptions(msg, index);
  const current = getCurrentBranch(msg, index);
  if (!options || !current) return;

  const currentIdx = options.indexOf(current);
  const nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
  if (nextIdx >= 0 && nextIdx < options.length) {
    store.setBranch(options[nextIdx]);
  }
}

async function handleSend() {
  const msg = userInput.value.trim();
  if (!msg || store.isLoading) return;
  userInput.value = '';
  store.sendMessage(msg);
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
        v-for="(msg, i) in displayMessages"
        :key="i"
        class="group"
      >
        <div
          :class="[
            'max-w-[80%] rounded-lg px-4 py-2 text-sm',
            getMessageType(msg) === 'human'
              ? 'ml-auto bg-primary text-primary-foreground'
              : 'bg-muted',
          ]"
        >
          {{ getMessageContent(msg) }}
        </div>

        <!-- Branch selector -->
        <div
          v-if="getBranchOptions(msg, i) && (getBranchOptions(msg, i)?.length ?? 0) > 1"
          class="flex items-center gap-1 mt-1 text-xs text-muted-foreground"
          :class="getMessageType(msg) === 'human' ? 'justify-end' : ''"
        >
          <button
            class="px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30"
            :disabled="getBranchOptions(msg, i)?.indexOf(getCurrentBranch(msg, i) ?? '') === 0"
            @click="switchBranch(msg, i, 'prev')"
          >
            &lt;
          </button>
          <span>
            {{ (getBranchOptions(msg, i)?.indexOf(getCurrentBranch(msg, i) ?? '') ?? 0) + 1 }}
            /
            {{ getBranchOptions(msg, i)?.length }}
          </span>
          <button
            class="px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30"
            :disabled="getBranchOptions(msg, i)?.indexOf(getCurrentBranch(msg, i) ?? '') === (getBranchOptions(msg, i)?.length ?? 1) - 1"
            @click="switchBranch(msg, i, 'next')"
          >
            &gt;
          </button>
        </div>
      </div>

      <div v-if="store.isLoading" class="flex items-center gap-2 text-muted-foreground text-sm">
        <span class="animate-pulse">Thinking...</span>
      </div>

      <div v-if="displayMessages.length === 0" class="text-center text-muted-foreground text-sm py-8">
        Try: "Add a task to buy milk" or "Mark task 1 as done"
      </div>
    </div>

    <!-- Input -->
    <form @submit.prevent="handleSend" class="p-4 border-t flex gap-2">
      <Input
        v-model="userInput"
        placeholder="Type a message..."
        :disabled="store.isLoading"
        class="flex-1"
      />
      <Button type="submit" :disabled="store.isLoading || !userInput.trim()">
        Send
      </Button>
    </form>

    <!-- Interrupt Dialog -->
    <InterruptDialog />
  </div>
</template>
