<template>
  <nav class="navbar mb-4">
    <div class="navbar-brand">
      <span class="logo">WINWAI</span>
    </div>
    <div v-if="username" class="user-info">
      <router-link v-if="isAdminUser" to="/admin" class="admin-link">จัดการผู้ใช้</router-link>
      <div class="user-meta">
        <span class="username">{{ username }}</span>
        <div v-if="expireDateText || accessStatusText" class="meta-detail-row">
          <span v-if="expireDateText" class="expire-text">
            หมดอายุ: {{ expireDateText }}
            <span v-if="expireRemainingText">({{ expireRemainingText }})</span>
          </span>
          <span v-if="accessStatusText" :class="statusClass">{{ accessStatusText }}</span>
        </div>
      </div>
      <button @click="logout" class="logout-button">ออกจากระบบ</button>
    </div>
    <div v-else>
      <button @click="$emit('open-auth-modal', 'login')" class="login-button">เข้าสู่ระบบ</button>
    </div>
  </nav>
</template>

<script>
import { formatExpireDate, getCurrentUser, getUserAccessState, logoutUser } from '@/utils/auth';

export default {
  name: "NavbarComponent",
  emits: ['open-auth-modal'],
  data() {
    return {
      username: null,
      isAdminUser: false,
      expireDateText: '',
      expireRemainingText: '',
      accessStatusText: '',
      accessStatusClass: '',
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

      const accessState = getUserAccessState(user);
      this.expireDateText = formatExpireDate(user?.expire_date);
      this.expireRemainingText = accessState.expireRemainingText;

      if (accessState.locked) {
        this.accessStatusText = 'สถานะ: ถูกล็อก';
        this.accessStatusClass = 'status-locked';
      } else if (accessState.expired) {
        this.accessStatusText = 'สถานะ: หมดอายุ';
        this.accessStatusClass = 'status-expired';
      } else {
        this.accessStatusText = '';
        this.accessStatusClass = '';
      }
    },
    logout() {
      logoutUser();
      this.username = null;
      this.isAdminUser = false;
      this.expireDateText = '';
      this.expireRemainingText = '';
      this.accessStatusText = '';
      this.accessStatusClass = '';
      this.$router.push('/');
    }
  },
  computed: {
    statusClass() {
      return ['access-status', this.accessStatusClass];
    }
  }
};
</script>

<style scoped>
.navbar {
  background-color: #333;
  color: white;
  padding: 0.35em 1em;
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
  gap: 0.75rem;
}

.user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  line-height: 1.1;
}

.username {
  font-weight: 600;
  font-size: 0.9rem;
}

.meta-detail-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.expire-text {
  font-size: 0.72rem;
  color: #d1d5db;
}

.access-status {
  font-size: 0.72rem;
  font-weight: 600;
}

.status-locked {
  color: #fca5a5;
}

.status-expired {
  color: #fde68a;
}

.admin-link {
  color: white;
  text-decoration: none;
  background-color: #2563eb;
  padding: 0.4em 0.75em;
  border-radius: 5px;
  font-size: 0.85rem;
}

.admin-link:hover {
  background-color: #1d4ed8;
}

.logout-button {
  background-color: #ff4c4c;
  color: white;
  border: none;
  padding: 0.4em 0.75em;
  cursor: pointer;
  border-radius: 5px;
  font-size: 0.85rem;
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

  .user-meta {
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .meta-detail-row {
    justify-content: center;
  }
}
</style>
