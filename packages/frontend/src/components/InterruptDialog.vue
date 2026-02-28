<script setup lang="ts">
import { computed } from 'vue';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/stores/agent';

const store = useAgentStore();
const isOpen = computed(() => store.interruptPayload !== null);
const payload = computed(() => store.interruptPayload);

async function handleApprove() {
  await store.resumeWithInput('approve');
}

async function handleReject() {
  await store.resumeWithInput('reject');
}
</script>

<template>
  <Dialog
    :open="isOpen"
    title="Action Confirmation"
    :description="payload?.question"
    @update:open="(val) => { if (!val) handleReject(); }"
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
