<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import GuideSidebar from '@/components/guide/GuideSidebar.vue';
import CompositionApiSection from '@/components/guide/CompositionApiSection.vue';
import ReactivitySection from '@/components/guide/ReactivitySection.vue';
import TemplateSyntaxSection from '@/components/guide/TemplateSyntaxSection.vue';
import PerformanceSection from '@/components/guide/PerformanceSection.vue';

const sections = [
  { id: 'composition-api', label: 'Composition API', icon: '🧩' },
  { id: 'reactivity', label: 'Reactivity System', icon: '⚡' },
  { id: 'template-syntax', label: 'Template & JSX', icon: '📝' },
  { id: 'performance', label: 'Performance', icon: '🚀' },
];

const activeSection = ref('composition-api');
const sidebarOpen = ref(false);

function navigateToSection(sectionId: string) {
  activeSection.value = sectionId;
  sidebarOpen.value = false;

  const el = document.getElementById(`section-${sectionId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function handleScroll() {
  const sectionElements = sections.map(s => ({
    id: s.id,
    el: document.getElementById(`section-${s.id}`),
  }));

  for (const { id, el } of sectionElements.reverse()) {
    if (el && el.getBoundingClientRect().top <= 120) {
      activeSection.value = id;
      break;
    }
  }
}

onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', handleScroll));
</script>

<template>
  <main class="container mx-auto px-4 py-8">
    <!-- Hero Section -->
    <div class="text-center mb-12">
      <div class="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
        Lovable Dev Vue Converter
      </div>
      <h1 class="text-4xl font-bold text-foreground mb-3">
        Advanced Vue.js Development Guide
      </h1>
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
        Deep-dive tutorials for professional Vue developers. Master React-to-Vue conversion
        patterns, advanced reactivity, template syntax, and performance optimization.
      </p>
    </div>

    <!-- Quick navigation cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      <button
        v-for="section in sections"
        :key="section.id"
        class="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all text-left group"
        @click="navigateToSection(section.id)"
      >
        <span class="text-2xl block mb-2">{{ section.icon }}</span>
        <span class="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {{ section.label }}
        </span>
      </button>
    </div>

    <div class="flex gap-8">
      <!-- Sidebar (desktop) -->
      <aside class="hidden lg:block w-56 shrink-0">
        <div class="sticky top-24">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
            Sections
          </p>
          <GuideSidebar
            :active-section="activeSection"
            :sections="sections"
            @navigate="navigateToSection"
          />
        </div>
      </aside>

      <!-- Mobile sidebar toggle -->
      <button
        class="lg:hidden fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
        @click="sidebarOpen = !sidebarOpen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <!-- Mobile sidebar drawer -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="sidebarOpen"
            class="lg:hidden fixed inset-0 z-40 bg-black/50"
            @click="sidebarOpen = false"
          />
        </Transition>
        <Transition name="slide">
          <div
            v-if="sidebarOpen"
            class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-xl p-6 max-h-[60vh] overflow-y-auto"
          >
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
              Sections
            </p>
            <GuideSidebar
              :active-section="activeSection"
              :sections="sections"
              @navigate="navigateToSection"
            />
          </div>
        </Transition>
      </Teleport>

      <!-- Content -->
      <div class="flex-1 min-w-0 space-y-16">
        <div id="section-composition-api">
          <CompositionApiSection />
        </div>
        <div id="section-reactivity">
          <ReactivitySection />
        </div>
        <div id="section-template-syntax">
          <TemplateSyntaxSection />
        </div>
        <div id="section-performance">
          <PerformanceSection />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateY(100%);
}
</style>
