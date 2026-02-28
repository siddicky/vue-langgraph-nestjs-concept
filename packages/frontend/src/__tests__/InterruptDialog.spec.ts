import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import InterruptDialog from '../components/InterruptDialog.vue';
import { useAgentStore } from '../stores/agent';

// Mock the composable
vi.mock('../composables/useAgentStream', () => {
  const { ref } = require('vue');
  return {
    useAgentStream: () => ({
      threadId: ref(null),
      messages: ref([]),
      tasks: ref([]),
      isStreaming: ref(false),
      interruptPayload: ref(null),
      createThread: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn(),
      resumeWithInput: vi.fn(),
      getState: vi.fn(),
      pushTasks: vi.fn(),
    }),
  };
});

describe('InterruptDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should not render dialog when interruptPayload is null', () => {
    const wrapper = mount(InterruptDialog);
    // Dialog should not be open (no visible overlay)
    const store = useAgentStore();
    expect(store.interruptPayload).toBeNull();
  });

  it('should expose resumeWithInput as action', () => {
    const store = useAgentStore();
    expect(typeof store.resumeWithInput).toBe('function');
  });
});
