import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue')
      },
      {
        path: '/feeds',
        name: 'Feeds',
        component: () => import('@/views/Feeds.vue')
      },
      {
        path: '/feeds/create',
        name: 'CreateFeed',
        component: () => import('@/views/CreateFeed.vue')
      },
      {
        path: '/feeds/:id/edit',
        name: 'EditFeed',
        component: () => import('@/views/EditFeed.vue')
      },
      {
        path: '/articles',
        name: 'Articles',
        component: () => import('@/views/Articles.vue')
      },
      {
        path: '/scripts',
        name: 'Scripts',
        component: () => import('@/views/Scripts.vue')
      },
      {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router