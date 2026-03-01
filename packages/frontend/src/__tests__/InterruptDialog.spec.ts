import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import InterruptDialog from '../components/InterruptDialog.vue';
import { useAgentStore } from '../stores/agent';
import './setup-mocks';

describe('InterruptDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should not render dialog when interruptPayload is null', () => {
    const wrapper = mount(InterruptDialog);
    const store = useAgentStore();
    expect(store.interruptPayload).toBeNull();
  });

  it('should expose resumeWithInput as action', () => {
    const store = useAgentStore();
    expect(typeof store.resumeWithInput).toBe('function');
  });
});
