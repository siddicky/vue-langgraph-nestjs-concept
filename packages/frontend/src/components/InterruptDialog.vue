<script setup lang="ts">
import { computed } from 'vue';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/stores/agent';

const store = useAgentStore();

// useStream interrupt format: { value, when, resumable, ns }
// value is the interrupt payload from the graph (our InterruptPayload shape)
const isOpen = computed(() => store.interrupt?.value != null);
const payload = computed(() => store.interrupt?.value as { question: string; options: string[]; pendingAction: any } | undefined);

async function handleApprove() {
  store.resumeWithInput('approve');
}

async function handleReject() {
  store.resumeWithInput('reject');
}
</script>

<template>
  <Dialog
    :open="isOpen"
    title="Action Confirmation"
    :description="payload?.question"
    @update:open="(val: boolean) => { if (!val) handleReject(); }"
  >
    <div class="flex justify-end gap-2 pt-4">
      <Button variant="outline" @click="handleReject">
        Reject
      </Button>
      <Button @click="handleApprove">
        Approve
      </Button>
    </div>
  </Dialog>
</template>
