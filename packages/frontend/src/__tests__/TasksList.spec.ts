import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { shallowRef, computed, ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import TasksList from '../components/TasksList.vue';
import { useAgentStore } from '../stores/agent';
import { TaskStatus } from '@todos/shared';

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

describe('TasksList', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render tasks from the store', () => {
    const store = useAgentStore();
    const wrapper = mount(TasksList);

    // Default tasks should render
    expect(wrapper.text()).toContain('Tasks');
    store.tasks.forEach((task) => {
      expect(wrapper.text()).toContain(task.title);
    });
  });

  it('should show empty message when no tasks', () => {
    const store = useAgentStore();
    // Clear all tasks
    const ids = store.tasks.map((t) => t.id);
    ids.forEach((id) => store.deleteTask(id));

    const wrapper = mount(TasksList);
    expect(wrapper.text()).toContain('No tasks yet');
  });

  it('should contain AddTodo component', () => {
    mount(TasksList);
    // AddTodo is a child component; we just verify TasksList mounts without error
  });
});
