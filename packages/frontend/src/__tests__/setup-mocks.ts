import { vi, type Mock } from 'vitest';
import { computed } from 'vue';

// Mock @assistant-ui/vue
vi.mock('@assistant-ui/vue', () => ({
  useExternalStoreRuntime: vi.fn(() => ({
    thread: {},
    threads: { mainItem: {} },
    subscribe: vi.fn(),
  })),
  useExternalMessageConverter: vi.fn(() => computed(() => [])),
  AssistantRuntimeProvider: {
    name: 'AssistantRuntimeProvider',
    template: '<slot />',
    props: ['runtime'],
  },
}));

// Mock @assistant-ui/vue-langgraph
vi.mock('@assistant-ui/vue-langgraph', () => ({
  convertLangChainMessages: vi.fn(() => []),
}));

// Mock @langchain/langgraph-sdk Client
vi.mock('@langchain/langgraph-sdk', () => ({
  Client: class MockClient {
    threads = {
      updateState: vi.fn(),
      create: vi.fn().mockResolvedValue({ thread_id: 'test-thread' }),
      getState: vi.fn().mockResolvedValue({ values: {}, tasks: [] }),
    };
    runs = {
      stream: vi.fn(() => ({
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.resolve({ done: true }),
        }),
      })),
    };
  },
}));
