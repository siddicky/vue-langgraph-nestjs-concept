<script setup lang="ts">
import CodeBlock from './CodeBlock.vue';
import GuideCard from './GuideCard.vue';
</script>

<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-2xl font-bold text-foreground">Performance & Optimization</h2>
      <p class="text-muted-foreground mt-2">
        Optimize converted components for Vue's reactivity system and deploy with Nuxt 3.
      </p>
    </div>

    <!-- Component Optimization -->
    <section id="component-optimization" class="space-y-6">
      <h3 class="text-xl font-semibold text-foreground border-b border-border pb-2">
        Component Optimization
      </h3>
      <p class="text-muted-foreground">
        Optimize converted components for Vue's reactivity system.
      </p>

      <div class="grid gap-6">
        <GuideCard title="Lazy Loading with defineAsyncComponent" icon="🦥">
          <p class="text-sm text-muted-foreground mb-3">
            Split large components into separate chunks that load on demand, reducing initial
            bundle size.
          </p>
          <CodeBlock
            title="Async Components"
            :code="`import { defineAsyncComponent } from 'vue';

// Basic lazy loading
const HeavyChart = defineAsyncComponent(
  () => import('./components/HeavyChart.vue')
);

// With loading and error states
const AsyncDashboard = defineAsyncComponent({
  loader: () => import('./components/Dashboard.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,         // Delay before showing loading (ms)
  timeout: 10000,     // Timeout before showing error (ms)
});

// Route-level code splitting (with Vue Router)
const routes = [
  {
    path: '/dashboard',
    component: () => import('./views/Dashboard.vue'),
  },
  {
    path: '/settings',
    component: () => import('./views/Settings.vue'),
  },
];

// Conditional lazy loading
<template>
  <component :is=&quot;showAdvanced ? AsyncAdvanced : BasicView&quot; />
</template>

// Suspense for async setup (experimental)
<Suspense>
  <template #default>
    <AsyncComponent />
  </template>
  <template #fallback>
    <LoadingSpinner />
  </template>
</Suspense>`"
          />
        </GuideCard>

        <GuideCard title="v-memo for Expensive Renders" icon="🧠">
          <p class="text-sm text-muted-foreground mb-3">
            Skip re-rendering of large sub-trees when dependency values haven't changed.
            Similar to React.memo but at the template level.
          </p>
          <CodeBlock
            title="v-memo Usage"
            :code="`<!-- v-memo skips re-render if dependencies haven't changed -->
<template>
  <!-- Only re-renders when item.id or selected changes -->
  <div v-for=&quot;item in longList&quot; :key=&quot;item.id&quot; v-memo=&quot;[item.id, selected === item.id]&quot;>
    <ExpensiveComponent :item=&quot;item&quot; :selected=&quot;selected === item.id&quot; />
  </div>

  <!-- Static content optimization -->
  <div v-memo=&quot;[]&quot;>
    <!-- This subtree will NEVER re-render -->
    <HeavyStaticContent />
  </div>

  <!-- Conditional memo -->
  <div v-memo=&quot;[theme, locale]&quot;>
    <!-- Only re-renders when theme or locale changes -->
    <ThemedComponent :theme=&quot;theme&quot; />
    <LocalizedContent :locale=&quot;locale&quot; />
  </div>
</template>

<!-- Compare with React.memo equivalent -->
// React
const MemoizedItem = React.memo(({ item, selected }) => (
  <ExpensiveComponent item={item} selected={selected} />
), (prev, next) => prev.item.id === next.item.id && prev.selected === next.selected);

// Vue: v-memo achieves the same at template level, no wrapper needed`"
          />
        </GuideCard>

        <GuideCard title="KeepAlive for Component Caching" icon="💾">
          <p class="text-sm text-muted-foreground mb-3">
            Cache component instances when switching between dynamic components to preserve state
            and avoid expensive re-initialization.
          </p>
          <CodeBlock
            title="KeepAlive Patterns"
            :code="`<template>
  <!-- Basic KeepAlive - caches all dynamic children -->
  <KeepAlive>
    <component :is=&quot;currentTab&quot; />
  </KeepAlive>

  <!-- Selective caching with include/exclude -->
  <KeepAlive :include=&quot;['Dashboard', 'UserProfile']&quot;>
    <component :is=&quot;currentView&quot; />
  </KeepAlive>

  <!-- Limit cached instances -->
  <KeepAlive :max=&quot;5&quot;>
    <component :is=&quot;currentView&quot; />
  </KeepAlive>

  <!-- With Vue Router -->
  <RouterView v-slot=&quot;{ Component }&quot;>
    <KeepAlive :include=&quot;cachedViews&quot;>
      <component :is=&quot;Component&quot; />
    </KeepAlive>
  </RouterView>
</template>

<script setup lang=&quot;ts&quot;>
import { onActivated, onDeactivated } from 'vue';

// Lifecycle hooks specific to KeepAlive
onActivated(() => {
  // Called when cached component becomes active again
  refreshData();
});

onDeactivated(() => {
  // Called when component is cached (switched away from)
  pauseTimers();
});
</script>`"
          />
        </GuideCard>

        <GuideCard title="Shallow Reactivity for Large Objects" icon="📊">
          <p class="text-sm text-muted-foreground mb-3">
            Reduce reactivity overhead for large datasets by using shallow tracking.
          </p>
          <CodeBlock
            title="Performance Patterns"
            :code="`import { shallowRef, triggerRef, shallowReactive } from 'vue';

// Large list from API - no deep tracking needed
const tableData = shallowRef<Row[]>([]);

async function loadData() {
  const data = await api.fetchRows();
  tableData.value = data; // Single trigger, no deep proxy creation
}

// Batch updates for large datasets
function updateRows(updates: Map<string, Partial<Row>>) {
  const rows = [...tableData.value];
  for (const [id, update] of updates) {
    const idx = rows.findIndex(r => r.id === id);
    if (idx >= 0) rows[idx] = { ...rows[idx], ...update };
  }
  tableData.value = rows; // Single reactive trigger
}

// Virtual scrolling for 10k+ items
// Use a library like vue-virtual-scroller
import { RecycleScroller } from 'vue-virtual-scroller';

<template>
  <RecycleScroller
    :items=&quot;tableData&quot;
    :item-size=&quot;48&quot;
    key-field=&quot;id&quot;
    v-slot=&quot;{ item }&quot;
  >
    <TableRow :row=&quot;item&quot; />
  </RecycleScroller>
</template>

// Object.freeze for truly immutable data
const config = ref(Object.freeze({
  apiUrl: 'https://api.example.com',
  features: Object.freeze(['a', 'b', 'c']),
}));
// Vue skips reactivity for frozen objects entirely`"
          />
        </GuideCard>
      </div>
    </section>

    <!-- Nuxt.js Integration -->
    <section id="nuxt-integration" class="space-y-6">
      <h3 class="text-xl font-semibold text-foreground border-b border-border pb-2">
        Nuxt.js Integration
      </h3>
      <p class="text-muted-foreground">
        Deploy converted components in Nuxt 3 applications.
      </p>

      <div class="grid gap-6">
        <GuideCard title="Auto-imports and Composables" icon="🔮">
          <p class="text-sm text-muted-foreground mb-3">
            Nuxt 3 auto-imports Vue APIs, composables, and utilities — no manual imports needed.
          </p>
          <CodeBlock
            title="Nuxt Auto-imports"
            :code="`<!-- No imports needed in Nuxt 3! -->
<script setup lang=&quot;ts&quot;>
// Vue APIs are auto-imported
const count = ref(0);
const doubled = computed(() => count.value * 2);

// Nuxt composables are auto-imported
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const { data } = await useFetch('/api/users');

// Your composables in composables/ are auto-imported
const { user, login } = useAuth();       // composables/useAuth.ts
const { theme } = useTheme();            // composables/useTheme.ts

// Components in components/ are auto-imported
// No need for: import MyButton from '~/components/MyButton.vue'
</script>

<template>
  <!-- Components just work -->
  <MyButton @click=&quot;count++&quot;>{{ doubled }}</MyButton>
  <UserCard :user=&quot;user&quot; />
</template>

<!-- nuxt.config.ts - customize auto-imports -->
export default defineNuxtConfig({
  imports: {
    dirs: ['composables', 'utils', 'stores'],
  },
  components: {
    dirs: ['~/components', '~/components/ui'],
  },
});`"
          />
        </GuideCard>

        <GuideCard title="Server-Side Rendering (SSR) Setup" icon="🖥">
          <p class="text-sm text-muted-foreground mb-3">
            Nuxt 3 provides SSR out of the box with hybrid rendering capabilities.
          </p>
          <CodeBlock
            title="Nuxt SSR Configuration"
            :code="`// nuxt.config.ts
export default defineNuxtConfig({
  // SSR is enabled by default
  ssr: true,

  // Hybrid rendering - per-route rules
  routeRules: {
    '/':          { prerender: true },          // Static at build
    '/dashboard': { ssr: false },               // Client-only (SPA)
    '/blog/**':   { swr: 3600 },                // Stale-while-revalidate
    '/api/**':    { cors: true, cache: false },  // API routes
    '/admin/**':  { ssr: false },               // No SSR for admin
  },

  // Nitro server configuration
  nitro: {
    preset: 'node-server', // or 'vercel', 'cloudflare', etc.
  },
});

// SSR-safe code patterns
<script setup lang=&quot;ts&quot;>
// ❌ Will fail during SSR (no window/document)
// window.addEventListener('resize', handler);

// ✅ Guard browser-only code
if (import.meta.client) {
  window.addEventListener('resize', handler);
}

// ✅ Or use onMounted (only runs on client)
onMounted(() => {
  window.addEventListener('resize', handler);
});

// ✅ Client-only components
<ClientOnly>
  <BrowserOnlyWidget />
  <template #fallback>
    <LoadingSkeleton />
  </template>
</ClientOnly>
</script>`"
          />
        </GuideCard>

        <GuideCard title="Data Fetching with useFetch" icon="🌐">
          <p class="text-sm text-muted-foreground mb-3">
            Nuxt's <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">useFetch</code>
            handles SSR-friendly data fetching with automatic deduplication and caching.
          </p>
          <CodeBlock
            title="Data Fetching"
            :code="`<script setup lang=&quot;ts&quot;>
// Basic fetch - works on both server and client
const { data: users, status, error, refresh } = await useFetch('/api/users');

// With options
const { data: user } = await useFetch(\`/api/users/\${id}\`, {
  method: 'GET',
  headers: { 'Authorization': \`Bearer \${token}\` },
  transform: (res) => res.data, // Transform response
  pick: ['name', 'email'],      // Select specific fields
  default: () => null,           // Default value
});

// Lazy fetch - doesn't block navigation
const { data, pending } = useLazyFetch('/api/posts');

// Watch for param changes
const page = ref(1);
const { data: posts } = await useFetch('/api/posts', {
  query: { page, limit: 10 },  // Reactive query params
  watch: [page],                // Re-fetch when page changes
});

// useAsyncData for custom async logic
const { data } = await useAsyncData('user-repos', () => {
  return $fetch(\`/api/users/\${user.value.id}/repos\`);
}, {
  watch: [user],
});

// Refresh and invalidation
await refreshNuxtData('user-repos'); // Refresh specific key
await refreshNuxtData();             // Refresh all data
</script>

<template>
  <div v-if=&quot;status === 'pending'&quot;>Loading...</div>
  <div v-else-if=&quot;error&quot;>Error: {{ error.message }}</div>
  <UserList v-else :users=&quot;users&quot; />
</template>`"
          />
        </GuideCard>

        <GuideCard title="Nuxt Modules and Plugins Integration" icon="🧱">
          <p class="text-sm text-muted-foreground mb-3">
            Extend Nuxt with modules for common features and plugins for app-level configuration.
          </p>
          <CodeBlock
            title="Modules and Plugins"
            :code="`// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',           // State management
    '@nuxtjs/tailwindcss',   // Tailwind CSS
    '@vueuse/nuxt',          // VueUse composables
    '@nuxt/image',           // Optimized images
    '@nuxtjs/i18n',          // Internationalization
    'nuxt-icon',             // Icon component
  ],

  // Module configuration
  pinia: {
    storesDirs: ['./stores/**'],
  },

  tailwindcss: {
    configPath: './tailwind.config.ts',
  },
});

// plugins/api.ts - Custom plugin
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  const api = $fetch.create({
    baseURL: config.public.apiBase,
    onRequest({ options }) {
      const token = useCookie('auth-token');
      if (token.value) {
        options.headers.set('Authorization', \`Bearer \${token.value}\`);
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        navigateTo('/login');
      }
    },
  });

  return {
    provide: { api }, // Available as useNuxtApp().$api
  };
});

// middleware/auth.ts - Route middleware
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated.value && to.path !== '/login') {
    return navigateTo('/login');
  }
});`"
          />
        </GuideCard>
      </div>
    </section>
  </div>
</template>
