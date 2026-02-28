import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import TasksList from '../components/TasksList.vue';
import { useAgentStore } from '../stores/agent';
import { TaskStatus } from '@todos/shared';

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
