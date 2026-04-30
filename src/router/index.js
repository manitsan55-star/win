import { createRouter, createWebHistory } from 'vue-router';
import AdminPage from '../components/AdminPage.vue';
import Home from '../components/Home.vue';
import { isAdmin, isAuthenticated } from '@/utils/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    redirect: '/'
  },
  {
    path: '/register',
    name: 'Register',
    redirect: '/'
  },
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/admin',
    name: 'AdminPage',
    component: AdminPage,
    meta: {
      requiresAuth: true,
      isAdmin: true,
    },
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/');
    return;
  }

  if (to.meta.isAdmin && !isAdmin()) {
    next('/');
    return;
  }

  next();
});

export default router;
