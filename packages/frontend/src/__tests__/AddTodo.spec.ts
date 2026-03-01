import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import AddTodo from '../components/AddTodo.vue';
import { useAgentStore } from '../stores/agent';
import './setup-mocks';

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
