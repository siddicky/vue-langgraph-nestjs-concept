<script setup lang="ts">
import CodeBlock from './CodeBlock.vue';
import GuideCard from './GuideCard.vue';
</script>

<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-2xl font-bold text-foreground">Reactivity System</h2>
      <p class="text-muted-foreground mt-2">
        Understand Vue's reactivity system for complex state management and learn how to convert
        React state patterns effectively.
      </p>
    </div>

    <!-- Deep Reactivity Patterns -->
    <section id="deep-reactivity" class="space-y-6">
      <h3 class="text-xl font-semibold text-foreground border-b border-border pb-2">
        Deep Reactivity Patterns
      </h3>
      <p class="text-muted-foreground">
        Understand Vue's reactivity system for complex state management.
      </p>

      <div class="grid gap-6">
        <GuideCard title="ref vs reactive: When to Use Each" icon="⚖">
          <p class="text-sm text-muted-foreground mb-3">
            Choose the right reactivity primitive for your use case. Both have trade-offs.
          </p>
          <CodeBlock
            title="ref vs reactive Comparison"
            :code="`import { ref, reactive } from 'vue';

// ✅ ref - Best for primitives and reassignable values
const count = ref(0);
const message = ref('hello');
const user = ref<User | null>(null);

// ref can be reassigned entirely
user.value = await fetchUser(); // ✅ Works
count.value++;                  // ✅ Access via .value

// ✅ reactive - Best for objects you won't reassign
const form = reactive({
  name: '',
  email: '',
  errors: {} as Record<string, string>,
});

form.name = 'Alice';            // ✅ Direct property access
form.errors.name = 'Required';  // ✅ Deep reactivity

// ❌ reactive pitfalls
let state = reactive({ count: 0 });
state = reactive({ count: 1 }); // ❌ Loses reactivity reference
const { count } = state;         // ❌ Destructured value is NOT reactive

// Rule of thumb:
// - Use ref() for everything (simpler, consistent)
// - Use reactive() for complex form objects or stores`"
          />
        </GuideCard>

        <GuideCard title="toRefs for Destructuring Reactive Objects" icon="🔗">
          <p class="text-sm text-muted-foreground mb-3">
            Safely destructure reactive objects while maintaining reactivity with
            <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">toRefs</code>.
          </p>
          <CodeBlock
            title="toRefs Pattern"
            :code="`import { reactive, toRefs, toRef } from 'vue';

const state = reactive({
  count: 0,
  name: 'Alice',
  items: [1, 2, 3],
});

// ❌ Loses reactivity
const { count, name } = state;

// ✅ Maintains reactivity with toRefs
const { count, name, items } = toRefs(state);
count.value++; // Still reactive, updates state.count

// ✅ Single property with toRef
const nameRef = toRef(state, 'name');

// Common pattern: composable return values
function useCounter() {
  const state = reactive({ count: 0, doubled: computed(() => state.count * 2) });

  function increment() { state.count++; }

  return { ...toRefs(state), increment };
}

// Consumer gets refs that stay reactive
const { count, doubled } = useCounter();`"
          />
        </GuideCard>

        <GuideCard title="shallowRef and shallowReactive Optimization" icon="🏎">
          <p class="text-sm text-muted-foreground mb-3">
            Use shallow reactivity for large data structures where deep tracking is unnecessary.
          </p>
          <CodeBlock
            title="Shallow Reactivity"
            :code="`import { shallowRef, shallowReactive, triggerRef } from 'vue';

// shallowRef - only .value assignment triggers updates
const largeList = shallowRef<Item[]>([]);

// ❌ This won't trigger updates
largeList.value.push(newItem);

// ✅ Replace the entire value
largeList.value = [...largeList.value, newItem];

// ✅ Or manually trigger
largeList.value.push(newItem);
triggerRef(largeList);

// shallowReactive - only root-level properties are reactive
const state = shallowReactive({
  nested: { count: 0 },  // NOT reactive
  topLevel: 'reactive',  // Reactive
});

state.topLevel = 'updated';       // ✅ Triggers update
state.nested.count++;              // ❌ Does NOT trigger update
state.nested = { count: 1 };      // ✅ Triggers update (root property)

// Best for:
// - Large arrays (1000+ items) from API responses
// - Third-party class instances (e.g., Map, Set wrappers)
// - Performance-critical state where you control updates`"
          />
        </GuideCard>

        <GuideCard title="Handling Nested Reactivity Correctly" icon="🪆">
          <p class="text-sm text-muted-foreground mb-3">
            Patterns for managing deeply nested reactive structures without pitfalls.
          </p>
          <CodeBlock
            title="Nested Reactivity"
            :code="`import { ref, reactive, watch, markRaw } from 'vue';

// Deep reactive objects - mutations at any level trigger updates
const config = reactive({
  theme: {
    colors: {
      primary: '#3490dc',
      secondary: '#ffed4a',
    },
  },
  plugins: [] as Plugin[],
});

config.theme.colors.primary = '#e3342f'; // ✅ Tracked

// markRaw - opt out of reactivity for specific objects
const chart = markRaw(new HeavyChartInstance());
const state = reactive({
  chart,           // Won't be made reactive
  data: [1, 2, 3], // Will be reactive
});

// Watch deep nested changes
watch(
  () => config.theme.colors,
  (colors) => applyTheme(colors),
  { deep: true }
);

// Nested arrays - use computed for derived state
const nestedItems = ref([
  { id: 1, children: [{ id: 11, active: true }] },
  { id: 2, children: [{ id: 21, active: false }] },
]);

const activeChildren = computed(() =>
  nestedItems.value.flatMap(item =>
    item.children.filter(child => child.active)
  )
);`"
          />
        </GuideCard>
      </div>
    </section>

    <!-- State Management Integration -->
    <section id="state-management" class="space-y-6">
      <h3 class="text-xl font-semibold text-foreground border-b border-border pb-2">
        State Management Integration
      </h3>
      <p class="text-muted-foreground">
        Convert React state patterns to Vue state management.
      </p>

      <div class="grid gap-6">
        <GuideCard title="Pinia Store Setup (Replaces Vuex)" icon="🍍">
          <p class="text-sm text-muted-foreground mb-3">
            Pinia is Vue's official state management, offering a simpler API than Vuex with full
            TypeScript support and Composition API integration.
          </p>
          <CodeBlock
            title="Pinia Setup Store"
            :code="`// stores/counter.ts - Setup store syntax (recommended)
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useCounterStore = defineStore('counter', () => {
  // State (equivalent to React's useState)
  const count = ref(0);
  const history = ref<number[]>([]);

  // Getters (equivalent to useMemo)
  const doubled = computed(() => count.value * 2);
  const hasHistory = computed(() => history.value.length > 0);

  // Actions (equivalent to dispatch/reducer)
  function increment() {
    history.value.push(count.value);
    count.value++;
  }

  function reset() {
    count.value = 0;
    history.value = [];
  }

  // Async actions
  async function fetchCount() {
    const res = await api.getCount();
    count.value = res.data;
  }

  return { count, history, doubled, hasHistory, increment, reset, fetchCount };
});

// Usage in component
const store = useCounterStore();
store.increment();
console.log(store.doubled); // No .value needed in template`"
          />
        </GuideCard>

        <GuideCard title="Context API to provide/inject" icon="🔌">
          <p class="text-sm text-muted-foreground mb-3">
            Vue's provide/inject replaces React's Context API for dependency injection across
            the component tree.
          </p>
          <CodeBlock
            title="Provide/Inject Pattern"
            :code="`// React Context
const ThemeContext = createContext('light');
function App() {
  return (
    <ThemeContext.Provider value=&quot;dark&quot;>
      <Child />
    </ThemeContext.Provider>
  );
}
function Child() {
  const theme = useContext(ThemeContext);
}

// Vue provide/inject with type safety
// types/injection-keys.ts
import type { InjectionKey, Ref } from 'vue';

export const ThemeKey: InjectionKey<Ref<'light' | 'dark'>> = Symbol('theme');
export const ApiKey: InjectionKey<ApiClient> = Symbol('api');

// Parent component
import { provide, ref } from 'vue';
import { ThemeKey } from '@/types/injection-keys';

const theme = ref<'light' | 'dark'>('dark');
provide(ThemeKey, theme);

// Child component (any depth)
import { inject } from 'vue';
import { ThemeKey } from '@/types/injection-keys';

const theme = inject(ThemeKey); // Ref<'light' | 'dark'> | undefined
const theme = inject(ThemeKey, ref('light')); // With default`"
          />
        </GuideCard>

        <GuideCard title="Composable-based State Sharing" icon="🔄">
          <p class="text-sm text-muted-foreground mb-3">
            Share reactive state across components using composables with module-level state.
          </p>
          <CodeBlock
            title="Shared Composable State"
            :code="`// composables/useAuth.ts
import { ref, computed, readonly } from 'vue';

// Module-level state - shared across all consumers
const user = ref<User | null>(null);
const token = ref<string | null>(null);
const loading = ref(false);

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function login(credentials: Credentials) {
    loading.value = true;
    try {
      const res = await api.login(credentials);
      user.value = res.user;
      token.value = res.token;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
  }

  return {
    user: readonly(user),  // Prevent external mutation
    isAuthenticated,
    isAdmin,
    loading: readonly(loading),
    login,
    logout,
  };
}

// Any component - all share the same state
const { user, isAuthenticated, login } = useAuth();`"
          />
        </GuideCard>

        <GuideCard title="Global State Patterns" icon="🌍">
          <p class="text-sm text-muted-foreground mb-3">
            Choose the right global state approach for your app's complexity.
          </p>
          <CodeBlock
            title="Global State Approaches"
            :code="`// 1. Simple global state with reactive()
// globals/appState.ts
import { reactive } from 'vue';

export const appState = reactive({
  sidebarOpen: false,
  notifications: [] as Notification[],
  locale: 'en',
});

// 2. Event bus replacement with mitt
import mitt from 'mitt';
type Events = {
  'task:created': Task;
  'toast:show': { message: string; type: 'success' | 'error' };
};
export const emitter = mitt<Events>();

// 3. Pinia for complex state (recommended)
// Supports devtools, SSR, plugins, and hot module replacement
export const useAppStore = defineStore('app', () => {
  const sidebar = ref(false);
  const notifications = ref<Notification[]>([]);

  function toggleSidebar() { sidebar.value = !sidebar.value; }
  function notify(n: Notification) { notifications.value.push(n); }

  return { sidebar, notifications, toggleSidebar, notify };
});`"
          />
        </GuideCard>
      </div>
    </section>
  </div>
</template>
