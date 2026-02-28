<template>
  <Teleport to="body">
    <div
      v-if="store.interruptPayload"
      class="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/40" @click.stop />

      <!-- Dialog -->
      <div class="relative bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-sm w-full mx-4 z-10">
        <h3 class="text-base font-semibold text-gray-900 mb-2">Confirm Action</h3>
        <p class="text-sm text-gray-600 mb-4">{{ store.interruptPayload.question }}</p>

        <!-- Action details -->
        <div class="bg-gray-50 rounded-lg px-3 py-2 mb-4 text-xs text-gray-500 font-mono">
          {{ store.interruptPayload.pendingAction.tool }}({{ JSON.stringify(store.interruptPayload.pendingAction.args) }})
        </div>

        <!-- Buttons -->
        <div class="flex gap-2 justify-end">
          <button
            v-if="!store.interruptPayload.options || store.interruptPayload.options.includes('no')"
            @click="handleResponse('no')"
            :disabled="store.isStreaming"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            No, cancel
          </button>
          <button
            v-if="!store.interruptPayload.options || store.interruptPayload.options.includes('yes')"
            @click="handleResponse('yes')"
            :disabled="store.isStreaming"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Yes, proceed
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useAgentStore } from '../stores/agent'

const store = useAgentStore()

async function handleResponse(response: string) {
  await store.resumeWithInput(response)
}
</script>
