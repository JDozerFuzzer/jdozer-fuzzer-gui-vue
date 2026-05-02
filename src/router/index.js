import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/fuzzers/create',
      name: 'fuzzers-create',
      component: () => import('../views/FuzzersCreateView.vue')
    },
    {
      path: '/fuzzers/monitor',
      name: 'fuzzers-monitor',
      component: () => import('../views/FuzzerMonitorView.vue')
    }
  ]
})

export default router
