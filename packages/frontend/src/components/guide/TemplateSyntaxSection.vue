<script setup lang="ts">
import CodeBlock from './CodeBlock.vue';
import GuideCard from './GuideCard.vue';

const conditionalRenderingCode = `// React JSX
function Component({ isLoggedIn, isAdmin, items }) {
  return (
    <div>
      {isLoggedIn ? <Dashboard /> : <LoginForm />}
      {isAdmin && <AdminPanel />}
      {items.length > 0 && <ItemList items={items} />}
    </div>
  );
}

// Vue Template
// v-if / v-else - conditionally renders (adds/removes DOM)
<Dashboard v-if="isLoggedIn" />
<LoginForm v-else />

// v-if for conditional blocks
<AdminPanel v-if="isAdmin" />

// v-if with v-else-if chain
<EmptyState v-if="items.length === 0" />
<ItemList v-else :items="items" />

// v-show - toggles CSS display (element stays in DOM)
// Use v-show for frequent toggles, v-if for rare changes
<Tooltip v-show="showTooltip">Helpful info</Tooltip>`;

const listRenderingCode = `// React JSX
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}

// Vue Template
<ul>
  // v-for with :key (required for efficient updates)
  <li v-for="todo in todos" :key="todo.id">
    {{ todo.title }}
  </li>

  // With index
  <li v-for="(todo, index) in todos" :key="todo.id">
    {{ index + 1 }}. {{ todo.title }}
  </li>

  // Iterating objects
  <div v-for="(value, key) in userProfile" :key="key">
    {{ key }}: {{ value }}
  </div>

  // Range
  <span v-for="n in 5" :key="n">{{ n }}</span>

  // v-for with v-if (use <template> wrapper)
  <template v-for="todo in todos" :key="todo.id">
    <li v-if="todo.active">{{ todo.title }}</li>
  </template>
</ul>`;

const eventHandlingCode = `// React JSX
<button onClick={handleClick}>Click</button>
<button onClick={() => handleDelete(id)}>Delete</button>
<form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
<input onChange={(e) => setQuery(e.target.value)} />

// Vue Template
// Basic events
<button @click="handleClick">Click</button>
<button @click="handleDelete(id)">Delete</button>

// Event modifiers (no manual e.preventDefault())
<form @submit.prevent="handleSubmit">
<a @click.stop.prevent="navigate">Link</a>

// Key modifiers
<input @keyup.enter="submit" />
<input @keydown.ctrl.s="save" />
<div @keyup.esc="close">

// Mouse modifiers
<button @click.right.prevent="showContextMenu">Right-click me</button>

// Once modifier (auto-removes listener after first trigger)
<button @click.once="initialize">Init</button>

// Access event object with $event
<input @input="handleInput($event)" />
<button @click="handleClick(id, $event)">Click</button>`;

const vModelCode = `// React controlled input
const [value, setValue] = useState('');
<input value={value} onChange={(e) => setValue(e.target.value)} />

// Vue v-model (two-way binding in one directive)
<input v-model="value" />

// v-model modifiers
<input v-model.trim="name" />        // Auto-trims whitespace
<input v-model.number="age" />       // Auto-converts to number
<input v-model.lazy="search" />      // Updates on 'change' not 'input'

// v-model on custom components (Vue 3.4+)
// Child component
// <script setup lang="ts">
//   const model = defineModel<string>();
//   const checked = defineModel<boolean>('checked');
// <\/script>
// <template>
//   <input :value="model" @input="model = $event.target.value" />
// <\/template>

// Parent usage
<CustomInput v-model="searchQuery" />
<CustomCheckbox v-model:checked="isActive" />

// Multiple v-model bindings
<UserForm
  v-model:first-name="first"
  v-model:last-name="last"
  v-model:email="email"
/>`;

const customDirectivesCode = `// directives/vFocus.ts - Auto-focus directive
import type { Directive } from 'vue';

export const vFocus: Directive = {
  mounted(el: HTMLElement) {
    el.focus();
  },
};

// directives/vClickOutside.ts - Click outside detection
export const vClickOutside: Directive<HTMLElement, () => void> = {
  mounted(el, binding) {
    el._clickOutside = (event: Event) => {
      if (!el.contains(event.target as Node)) {
        binding.value();
      }
    };
    document.addEventListener('click', el._clickOutside);
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside);
  },
};

// directives/vIntersect.ts - Intersection observer
export const vIntersect: Directive<HTMLElement, () => void> = {
  mounted(el, binding) {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) binding.value();
    });
    observer.observe(el);
    el._observer = observer;
  },
  unmounted(el) {
    el._observer?.disconnect();
  },
};

// Usage in template
<input v-focus />
<div v-click-outside="closeDropdown">...</div>
<div v-intersect="loadMore">Loading trigger</div>`;

const builtInDirectivesCode = `// v-bind (:) - Dynamic attribute binding
<img :src="imageUrl" :alt="description" />
<div :class="{ active: isActive, 'text-red': hasError }"></div>
<div :style="{ color: textColor, fontSize: size + 'px' }"></div>

// Bind multiple attributes at once
<input v-bind="inputAttrs" />
// Where inputAttrs = { type: 'text', placeholder: 'Search...', id: 'search' }

// v-on (@) - Event binding
<button @click="handler">Click</button>
<button v-on="{ mouseenter: onEnter, mouseleave: onLeave }">Hover</button>

// v-slot (#) - Named and scoped slots
<BaseLayout>
  <template #header>
    <h1>Page Title</h1>
  </template>

  <template #default>
    <p>Main content</p>
  </template>

  <template #footer="{ year }">
    <p>Copyright {{ year }}</p>
  </template>
</BaseLayout>

// Scoped slots with destructuring
<DataTable :items="users">
  <template #cell-name="{ item }">
    <strong>{{ item.name }}</strong>
  </template>
  <template #cell-actions="{ item }">
    <button @click="edit(item)">Edit</button>
  </template>
</DataTable>`;

const dynamicArgsCode = `// Dynamic attribute name
<button :[attrName]="attrValue">Click</button>
// If attrName = 'disabled', renders as <button disabled="true">

// Dynamic event name
<button @[eventName]="handler">Click</button>
// If eventName = 'click', equivalent to @click="handler"

// Practical example: configurable event binding
// <script setup lang="ts">
//   const trigger = ref<'click' | 'mouseenter'>('click');
//   const position = ref<'top' | 'bottom'>('top');
// <\/script>
//
// <template>
//   <div @[trigger]="showTooltip">
//     Hover or click me
//   </div>
// <\/template>

// Dynamic v-slot name
// <template v-for="col in columns" #[col.slot]="{ item }">
//   <component :is="col.renderer" :data="item[col.key]" />
// <\/template>`;

const modifiersCode = `// Event modifiers
@click.stop          // stopPropagation()
@click.prevent       // preventDefault()
@click.stop.prevent  // Both
@click.self          // Only if target is element itself
@click.once          // Trigger at most once
@click.passive       // Passive listener (scroll performance)
@click.capture       // Capture mode

// Key modifiers
@keyup.enter         // Enter key
@keyup.tab           // Tab key
@keyup.delete        // Delete or Backspace
@keyup.esc           // Escape
@keyup.space         // Space
@keyup.up / .down / .left / .right  // Arrow keys

// System key modifiers
@click.ctrl          // Ctrl + click
@click.alt           // Alt + click
@click.shift         // Shift + click
@click.meta          // Cmd (Mac) / Win key
@click.ctrl.exact    // ONLY Ctrl, no other keys

// Mouse button modifiers
@click.left          // Left button only
@click.right         // Right button only
@click.middle        // Middle button only

// v-model modifiers
v-model.lazy         // Sync on change instead of input
v-model.number       // Cast to number
v-model.trim         // Trim whitespace

// Custom component modifier handling (Vue 3.4+)
const [model, modifiers] = defineModel<string>({
  set(value) {
    if (modifiers.capitalize) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  },
});`;
</script>

<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-2xl font-bold text-foreground">Template Syntax & JSX</h2>
      <p class="text-muted-foreground mt-2">
        Transform React JSX patterns to Vue template syntax and leverage Vue's powerful directive
        system.
      </p>
    </div>

    <!-- JSX to Template Conversion -->
    <section id="jsx-to-template" class="space-y-6">
      <h3 class="text-xl font-semibold text-foreground border-b border-border pb-2">
        JSX to Template Conversion
      </h3>
      <p class="text-muted-foreground">
        Transform React JSX patterns to Vue template syntax.
      </p>

      <div class="grid gap-6">
        <GuideCard title="Conditional Rendering (v-if, v-show)" icon="🔀">
          <p class="text-sm text-muted-foreground mb-3">
            Vue provides template-level directives for conditional rendering, replacing JSX
            ternaries and logical AND patterns.
          </p>
          <CodeBlock title="Conditional Rendering" :code="conditionalRenderingCode" />
        </GuideCard>

        <GuideCard title="List Rendering with v-for" icon="📜">
          <p class="text-sm text-muted-foreground mb-3">
            Replace JSX <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">.map()</code>
            patterns with Vue's <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">v-for</code>
            directive.
          </p>
          <CodeBlock title="List Rendering" :code="listRenderingCode" />
        </GuideCard>

        <GuideCard title="Event Handling (@click, @input)" icon="🖱">
          <p class="text-sm text-muted-foreground mb-3">
            Vue's event system uses the <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">@</code>
            shorthand (or <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">v-on:</code>)
            with powerful modifiers.
          </p>
          <CodeBlock title="Event Handling" :code="eventHandlingCode" />
        </GuideCard>

        <GuideCard title="Two-way Binding with v-model" icon="🔗">
          <p class="text-sm text-muted-foreground mb-3">
            Vue's <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">v-model</code>
            provides two-way data binding, eliminating boilerplate for controlled components.
          </p>
          <CodeBlock title="v-model Patterns" :code="vModelCode" />
        </GuideCard>
      </div>
    </section>

    <!-- Directive System -->
    <section id="directives" class="space-y-6">
      <h3 class="text-xl font-semibold text-foreground border-b border-border pb-2">
        Directive System
      </h3>
      <p class="text-muted-foreground">
        Leverage Vue's powerful directive system.
      </p>

      <div class="grid gap-6">
        <GuideCard title="Custom Directives for Reusable Behavior" icon="🎯">
          <p class="text-sm text-muted-foreground mb-3">
            Custom directives provide low-level DOM access for behaviors that don't fit into
            components or composables.
          </p>
          <CodeBlock title="Custom Directives" :code="customDirectivesCode" />
        </GuideCard>

        <GuideCard title="Built-in Directives (v-bind, v-on, v-slot)" icon="📦">
          <p class="text-sm text-muted-foreground mb-3">
            Vue's built-in directives cover binding, events, and slot management with concise
            shorthand syntax.
          </p>
          <CodeBlock title="Built-in Directives" :code="builtInDirectivesCode" />
        </GuideCard>

        <GuideCard title="Dynamic Directive Arguments" icon="🔧">
          <p class="text-sm text-muted-foreground mb-3">
            Use dynamic arguments to make directives flexible and data-driven.
          </p>
          <CodeBlock title="Dynamic Arguments" :code="dynamicArgsCode" />
        </GuideCard>

        <GuideCard title="Directive Modifiers and Shortcuts" icon="⚡">
          <p class="text-sm text-muted-foreground mb-3">
            Modifiers are postfixes that alter directive behavior, reducing boilerplate code.
          </p>
          <CodeBlock title="Modifiers Reference" :code="modifiersCode" />
        </GuideCard>
      </div>
    </section>
  </div>
</template>
