import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/Login.vue';
import Home from '../components/Home.vue';
import Register from '../components/Register.vue';
import AdminPage from '../components/AdminPage.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
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
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;
  const isAdmin = isAuthenticated && JSON.parse(atob(token.split('.')[1])).username === 'admin'; // Check if the user is admin

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/');
  } else if (to.meta.isAdmin && !isAdmin) {
    next('/');
  } else {
    next();
  }
});

export default router;
