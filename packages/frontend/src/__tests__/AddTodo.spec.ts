import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { shallowRef, computed, ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import AddTodo from '../components/AddTodo.vue';
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

describe('AddTodo', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render an input and a button', () => {
    const wrapper = mount(AddTodo);
    expect(wrapper.find('input').exists()).toBe(true);
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('should disable the button when input is empty', () => {
    const wrapper = mount(AddTodo);
    const button = wrapper.find('button');
    expect(button.attributes('disabled')).toBeDefined();
  });

  it('should enable the button when input has text', async () => {
    const wrapper = mount(AddTodo);
    const input = wrapper.find('input');
    await input.setValue('New task');

    const button = wrapper.find('button');
    expect(button.attributes('disabled')).toBeUndefined();
  });

  it('should add a task and clear input on submit', async () => {
    const store = useAgentStore();
    const initialCount = store.tasks.length;

    const wrapper = mount(AddTodo);
    const input = wrapper.find('input');
    await input.setValue('Test task');

    await wrapper.find('form').trigger('submit');

    expect(store.tasks.length).toBe(initialCount + 1);
    expect(store.tasks[store.tasks.length - 1].title).toBe('Test task');
  });

  it('should not add a task if input is only whitespace', async () => {
    const store = useAgentStore();
    const initialCount = store.tasks.length;

    const wrapper = mount(AddTodo);
    const input = wrapper.find('input');
    await input.setValue('   ');

    await wrapper.find('form').trigger('submit');

    expect(store.tasks.length).toBe(initialCount);
  });
});
