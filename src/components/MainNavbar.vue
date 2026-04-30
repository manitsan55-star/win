<template>
  <nav class="navbar mb-4">
    <div class="navbar-brand">
      <span class="logo">WINWAI</span>
    </div>
    <div v-if="username" class="user-info">
      <router-link v-if="isAdminUser" to="/admin" class="admin-link">จัดการผู้ใช้</router-link>
      <span class="username">{{ username }}</span>
      <button @click="logout" class="logout-button">ออกจากระบบ</button>
    </div>
    <div v-else>
      <button @click="$emit('open-auth-modal', 'login')" class="login-button">เข้าสู่ระบบ</button>
    </div>
  </nav>
</template>

<script>
import { getCurrentUser, logoutUser } from '@/utils/auth';

export default {
  name: "NavbarComponent",
  emits: ['open-auth-modal'],
  data() {
    return {
      username: null,
      isAdminUser: false,
    };
  },
  created() {
    this.loadUser();
    window.addEventListener('auth-changed', this.loadUser);
  },
  beforeUnmount() {
    window.removeEventListener('auth-changed', this.loadUser);
  },
  methods: {
    loadUser() {
      const user = getCurrentUser();
      this.username = user ? user.username : null;
      this.isAdminUser = user?.role === 'admin';
    },
    logout() {
      logoutUser();
      this.username = null;
      this.isAdminUser = false;
      this.$router.push('/');
    }
  }
};
</script>

<style scoped>
.navbar {
  background-color: #333;
  color: white;
  padding: 0.5em 1em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #444;
}

.navbar-brand {
  display: flex;
  align-items: center;
  font-size: 1.5em;
  font-weight: bold;
}

.logo {
  color: #fff;
  text-transform: uppercase;
}

.user-info {
  display: flex;
  align-items: center;
}

.username {
  margin-right: 1em;
}

.admin-link {
  color: white;
  text-decoration: none;
  margin-right: 1em;
  background-color: #2563eb;
  padding: 0.5em 1em;
  border-radius: 5px;
}

.admin-link:hover {
  background-color: #1d4ed8;
}

.logout-button {
  background-color: #ff4c4c;
  color: white;
  border: none;
  padding: 0.5em 1em;
  cursor: pointer;
  border-radius: 5px;
}

.login-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5em 1em;
  cursor: pointer;
  border-radius: 5px;
}

.logout-button:hover {
  background-color: #e03c3c;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0.5em;
    flex-direction: column;
    text-align: center;
  }
  
  .navbar-brand {
    font-size: 1.2em;
  }
  
  .user-info {
    margin-top: 0.5em;
    flex-direction: column;
  }
}
</style>
