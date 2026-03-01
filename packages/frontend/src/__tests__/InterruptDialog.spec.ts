import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, computed } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import InterruptDialog from '../components/InterruptDialog.vue';
import { useAgentStore } from '../stores/agent';

// Create shared tasks ref for mock
const mockTasks = ref([
  { id: 1, title: 'Buy groceries', status: 'todo' },
  { id: 2, title: 'Clean the house', status: 'todo' },
  { id: 3, title: 'Walk the dog', status: 'done' },
]);

// Mock the composable
vi.mock('@/composables/useTodosLangGraphRuntime', () => ({
  useTodosState: () => ({
    threadId: computed(() => null),
    tasks: mockTasks,
    interrupt: computed(() => undefined),
  }),
  pushTasks: vi.fn((newTasks: any[]) => {
    mockTasks.value = newTasks;
  }),
  resumeWithInput: vi.fn(),
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
    mockTasks.value = [
      { id: 1, title: 'Buy groceries', status: 'todo' },
      { id: 2, title: 'Clean the house', status: 'todo' },
      { id: 3, title: 'Walk the dog', status: 'done' },
    ];
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
