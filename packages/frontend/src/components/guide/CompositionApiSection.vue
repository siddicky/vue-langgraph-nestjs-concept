<script setup lang="ts">
import CodeBlock from './CodeBlock.vue';
import GuideCard from './GuideCard.vue';
</script>

<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-2xl font-bold text-foreground">Composition API Advanced Patterns</h2>
      <p class="text-muted-foreground mt-2">
        Master the conversion of React patterns to Vue 3's Composition API with practical examples
        and best practices.
      </p>
    </div>

    <!-- React Hooks to Vue Composables -->
    <section id="hooks-to-composables" class="space-y-6">
      <h3 class="text-xl font-semibold text-foreground border-b border-border pb-2">
        React Hooks to Vue Composables
      </h3>
      <p class="text-muted-foreground">
        Master the conversion of React patterns to Vue 3's Composition API.
      </p>

      <div class="grid gap-6">
        <GuideCard title="useState → ref() and reactive()" icon="🔄">
          <p class="text-sm text-muted-foreground mb-3">
            React's <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">useState</code>
            maps directly to Vue's <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">ref()</code>
            for primitives and <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">reactive()</code>
            for objects. Unlike React, Vue's refs are mutable and automatically trigger re-renders.
          </p>
          <CodeBlock
            title="React → Vue Conversion"
            :code="`// React
const [count, setCount] = useState(0);
const [user, setUser] = useState({ name: '', age: 0 });

// Vue 3 - ref for primitives
const count = ref(0);
count.value++; // Direct mutation triggers reactivity

// Vue 3 - reactive for objects
const user = reactive({ name: '', age: 0 });
user.name = 'Alice'; // Deep reactivity built-in

// Vue 3 - ref for objects (also works)
const userRef = ref({ name: '', age: 0 });
userRef.value.name = 'Alice'; // Access via .value`"
          />
        </GuideCard>

        <GuideCard title="useEffect → watchEffect() and watch()" icon="👁">
          <p class="text-sm text-muted-foreground mb-3">
            Vue provides two distinct APIs for side effects:
            <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">watchEffect()</code>
            for automatic dependency tracking and
            <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">watch()</code>
            for explicit sources with access to old/new values.
          </p>
          <CodeBlock
            title="Effect Conversion Patterns"
            :code="`// React
useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);

useEffect(() => {
  fetchUser(userId);
}, [userId]);

// Vue 3 - watchEffect (auto-tracks dependencies)
watchEffect(() => {
  document.title = \`Count: \${count.value}\`;
});

// Vue 3 - watch (explicit source, old/new values)
watch(userId, async (newId, oldId) => {
  console.log(\`Changed from \${oldId} to \${newId}\`);
  await fetchUser(newId);
}, { immediate: true });

// Vue 3 - watch multiple sources
watch([firstName, lastName], ([newFirst, newLast]) => {
  fullName.value = \`\${newFirst} \${newLast}\`;
});`"
          />
        </GuideCard>

        <GuideCard title="useMemo → computed()" icon="🧮">
          <p class="text-sm text-muted-foreground mb-3">
            Vue's <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">computed()</code>
            automatically tracks dependencies and caches results. No dependency array needed.
          </p>
          <CodeBlock
            title="Memoization Pattern"
            :code="`// React
const filteredTodos = useMemo(() => {
  return todos.filter(t => t.status === filter);
}, [todos, filter]);

const expensiveValue = useMemo(() => computeExpensive(a, b), [a, b]);

// Vue 3 - computed (auto-tracks, auto-caches)
const filteredTodos = computed(() => {
  return todos.value.filter(t => t.status === filter.value);
});

// Writable computed
const fullName = computed({
  get: () => \`\${firstName.value} \${lastName.value}\`,
  set: (val) => {
    const [first, last] = val.split(' ');
    firstName.value = first;
    lastName.value = last;
  }
});`"
          />
        </GuideCard>

        <GuideCard title="Custom Hooks → Composables Pattern" icon="🧩">
          <p class="text-sm text-muted-foreground mb-3">
            Vue composables follow the same pattern as React hooks but with Vue's reactivity system.
            Convention: prefix with <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">use</code>.
          </p>
          <CodeBlock
            title="Composable Pattern"
            :code="`// React custom hook
function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return pos;
}

// Vue composable
export function useMousePosition() {
  const x = ref(0);
  const y = ref(0);

  function handler(e: MouseEvent) {
    x.value = e.clientX;
    y.value = e.clientY;
  }

  onMounted(() => window.addEventListener('mousemove', handler));
  onUnmounted(() => window.removeEventListener('mousemove', handler));

  return { x, y }; // Return refs for reactivity
}

// Usage in component
const { x, y } = useMousePosition();`"
          />
        </GuideCard>
      </div>
    </section>

    <!-- Script Setup Optimization -->
    <section id="script-setup" class="space-y-6">
      <h3 class="text-xl font-semibold text-foreground border-b border-border pb-2">
        Script Setup Optimization
      </h3>
      <p class="text-muted-foreground">
        Learn best practices for Vue 3's script setup syntax.
      </p>

      <div class="grid gap-6">
        <GuideCard title="defineProps and defineEmits Usage" icon="📋">
          <p class="text-sm text-muted-foreground mb-3">
            Compiler macros that provide type-safe props and events without runtime overhead.
          </p>
          <CodeBlock
            title="Props and Emits"
            :code="`<script setup lang=&quot;ts&quot;>
// Type-based props declaration (recommended)
const props = defineProps<{
  title: string;
  count?: number;
  items: Array<{ id: string; label: string }>;
}>();

// With defaults
const props = withDefaults(defineProps<{
  title: string;
  count?: number;
}>(), {
  count: 0,
});

// Type-based emits
const emit = defineEmits<{
  update: [id: string, value: number];
  delete: [id: string];
  'update:modelValue': [value: string];
}>();

// Usage
emit('update', '123', 42);
</script>`"
          />
        </GuideCard>

        <GuideCard title="defineExpose for Component Methods" icon="🔓">
          <p class="text-sm text-muted-foreground mb-3">
            Explicitly expose public properties and methods from script setup components.
          </p>
          <CodeBlock
            title="Component Exposure"
            :code="`<script setup lang=&quot;ts&quot;>
import { ref } from 'vue';

const inputRef = ref<HTMLInputElement>();
const count = ref(0);

function reset() {
  count.value = 0;
}

function focus() {
  inputRef.value?.focus();
}

// Only exposed members are accessible via template refs
defineExpose({ reset, focus, count });
</script>

<!-- Parent component usage -->
<script setup lang=&quot;ts&quot;>
const childRef = ref<InstanceType<typeof ChildComponent>>();
childRef.value?.reset();     // ✅ Accessible
childRef.value?.focus();     // ✅ Accessible
childRef.value?.inputRef;    // ❌ Not exposed
</script>`"
          />
        </GuideCard>

        <GuideCard title="TypeScript Integration with Generics" icon="📐">
          <p class="text-sm text-muted-foreground mb-3">
            Generic components enable type-safe reusable patterns.
          </p>
          <CodeBlock
            title="Generic Components"
            :code="`<script setup lang=&quot;ts&quot; generic=&quot;T extends { id: string }&quot;>
// Generic component with constrained type
defineProps<{
  items: T[];
  selected?: T;
}>();

defineEmits<{
  select: [item: T];
  delete: [item: T];
}>();

// T is available throughout the template
</script>

<template>
  <ul>
    <li v-for=&quot;item in items&quot; :key=&quot;item.id&quot;>
      <slot :item=&quot;item&quot; />
    </li>
  </ul>
</template>

<!-- Usage with inferred types -->
<GenericList
  :items=&quot;users&quot;
  @select=&quot;(user) => handleSelect(user)&quot;
>
  <template #default=&quot;{ item }&quot;>
    {{ item.name }}
  </template>
</GenericList>`"
          />
        </GuideCard>

        <GuideCard title="Compiler Macros and Auto-imports" icon="⚡">
          <p class="text-sm text-muted-foreground mb-3">
            Script setup provides compiler macros that don't need importing, plus ecosystem
            auto-import support.
          </p>
          <CodeBlock
            title="Compiler Macros"
            :code="`<script setup lang=&quot;ts&quot;>
// These are compiler macros - no import needed
defineProps<{ msg: string }>();
defineEmits<{ click: [] }>();
defineExpose({ publicMethod });
defineOptions({ inheritAttrs: false });
defineSlots<{ default: (props: { item: Item }) => any }>();
defineModel<string>(); // Vue 3.4+

// With unplugin-auto-import, these also don't need imports:
const count = ref(0);           // auto-imported from 'vue'
const doubled = computed(() => count.value * 2);
const route = useRoute();       // auto-imported from 'vue-router'
const store = useMyStore();     // auto-imported from pinia store
</script>`"
          />
        </GuideCard>
      </div>
    </section>
  </div>
</template>
