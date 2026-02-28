<template>
  <div class="fixed bottom-4 right-4 z-50">
    <!-- Toggle button -->
    <button
      v-if="!isOpen"
      @click="isOpen = true"
      class="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
      title="Open AI assistant"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
      </svg>
    </button>

    <!-- Chat panel -->
    <div
      v-if="isOpen"
      class="w-80 h-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-blue-600 rounded-t-xl">
        <h2 class="text-sm font-semibold text-white">AI Assistant</h2>
        <button @click="isOpen = false" class="text-white hover:text-gray-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-3 space-y-2">
        <div v-if="store.messages.length === 0" class="text-center text-gray-400 text-xs py-4">
          Ask me to help manage your tasks!
        </div>
        <div
          v-for="(msg, idx) in store.messages"
          :key="idx"
          :class="[
            'rounded-lg px-3 py-2 text-sm max-w-[85%]',
            msg.role === 'user'
              ? 'ml-auto bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800'
          ]"
        >
          {{ msg.content }}
        </div>
        <div v-if="store.isStreaming" class="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 flex gap-1 w-fit">
          <span class="animate-bounce">•</span>
          <span class="animate-bounce" style="animation-delay: 0.1s">•</span>
          <span class="animate-bounce" style="animation-delay: 0.2s">•</span>
        </div>
      </div>

      <!-- Error -->
      <div v-if="store.error" class="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
        {{ store.error }}
      </div>

      <!-- Input -->
      <div class="flex gap-2 px-3 py-3 border-t border-gray-200">
        <input
          v-model="input"
          @keyup.enter="handleSend"
          type="text"
          placeholder="Ask the AI..."
          :disabled="store.isStreaming"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          @click="handleSend"
          :disabled="store.isStreaming || !input.trim()"
          class="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useAgentStore } from '../stores/agent'

const store = useAgentStore()
const isOpen = ref(false)
const input = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

watch(
  () => store.messages.length,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  },
)

async function handleSend() {
  const text = input.value.trim()
  if (!text || store.isStreaming) return
  input.value = ''
  await store.sendMessage(text)
}
</script>
