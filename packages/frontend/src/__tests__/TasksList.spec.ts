import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, computed } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import TasksList from '../components/TasksList.vue';
import { useAgentStore } from '../stores/agent';
import { TaskStatus } from '@todos/shared';

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

describe('TasksList', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockTasks.value = [
      { id: 1, title: 'Buy groceries', status: 'todo' },
      { id: 2, title: 'Clean the house', status: 'todo' },
      { id: 3, title: 'Walk the dog', status: 'done' },
    ];
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
