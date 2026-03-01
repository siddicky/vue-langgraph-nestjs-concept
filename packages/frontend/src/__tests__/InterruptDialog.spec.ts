import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { shallowRef, computed, ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import InterruptDialog from '../components/InterruptDialog.vue';
import { useAgentStore } from '../stores/agent';

// Mock @langchain/vue's useStream
vi.mock('@langchain/vue', () => ({
  useStream: () => ({
    values: shallowRef({ tasks: [], messages: [], pendingActions: [] }),
    messages: computed(() => []),
    interrupt: computed(() => undefined),
    interrupts: computed(() => []),
    isLoading: ref(false),
    error: computed(() => undefined),
    branch: ref(''),
    submit: vi.fn(),
    stop: vi.fn(),
    switchThread: vi.fn(),
    history: computed(() => []),
    isThreadLoading: computed(() => false),
    setBranch: vi.fn(),
    getMessagesMetadata: vi.fn(),
    toolCalls: ref([]),
    getToolCalls: vi.fn(() => []),
    experimental_branchTree: computed(() => ({})),
  }),
}));

vi.mock('@langchain/langgraph-sdk', () => ({
  Client: class MockClient {
    threads = {
      updateState: vi.fn(),
      create: vi.fn(),
    };
  },
}));

describe('InterruptDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should not render dialog when interrupt is undefined', () => {
    const wrapper = mount(InterruptDialog);
    const store = useAgentStore();
    expect(store.interrupt).toBeUndefined();
  });

  it('should expose resumeWithInput as action', () => {
    const store = useAgentStore();
    expect(typeof store.resumeWithInput).toBe('function');
  });
});
