import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/guide',
      name: 'guide',
      component: () => import('@/views/VueAdvancedGuide.vue'),
    },
  ],
});

export default router;
