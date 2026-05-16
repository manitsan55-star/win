<template>
  <nav class="navbar mb-4">
    <div class="navbar-brand">
      <span class="logo">WINWAI</span>
      <button v-if="username" type="button" class="payment-button" @click="$emit('open-payment-modal')">วิธีชำระเงิน</button>
      <button v-if="username" type="button" class="mobile-user-toggle mobile-only" @click="toggleMobileDetails">
        {{ isMobileDetailsOpen ? 'ซ่อนข้อมูล' : 'แสดงข้อมูล' }}
      </button>
      <button v-if="!username" type="button" class="mobile-login-button mobile-only" @click="$emit('open-auth-modal', 'login')">เข้าสู่ระบบ</button>
    </div>
    <div v-if="username" class="user-info">
      <div class="user-panel" :class="{ 'mobile-open': isMobileDetailsOpen }">
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
        <button v-if="!isAdminUser" @click="openPasswordModal" class="change-password-button">เปลี่ยนรหัสผ่าน</button>
        <button @click="logout" class="logout-button">ออกจากระบบ</button>
      </div>
    </div>
    <div v-else class="user-info">
      <button class="login-button desktop-only" @click="$emit('open-auth-modal', 'login')">เข้าสู่ระบบ</button>
    </div>

    <div v-if="showPasswordModal" class="modal-overlay" @click="closePasswordModal">
      <div class="modal-card" @click.stop>
        <h3>เปลี่ยนรหัสผ่าน</h3>
        <form @submit.prevent="submitPasswordChange" class="auth-form">
          <div class="form-group">
            <label for="current-password">รหัสผ่านเดิม</label>
            <input id="current-password" v-model="passwordForm.currentPassword" type="password" class="form-control" />
          </div>
          <div class="form-group">
            <label for="new-password">รหัสผ่านใหม่</label>
            <input id="new-password" v-model="passwordForm.newPassword" type="password" class="form-control" />
          </div>
          <div class="form-group">
            <label for="confirm-new-password">ยืนยันรหัสผ่านใหม่</label>
            <input id="confirm-new-password" v-model="passwordForm.confirmNewPassword" type="password" class="form-control" />
          </div>
          <div v-if="passwordErrorMessage" class="error-message">{{ passwordErrorMessage }}</div>
          <div class="action-row">
            <button type="button" class="secondary-button" :disabled="isChangingPassword" @click="closePasswordModal">ยกเลิก</button>
            <button type="submit" class="primary-button" :disabled="isChangingPassword">{{ isChangingPassword ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน' }}</button>
          </div>
        </form>
      </div>
    </div>
  </nav>
</template>

<script>
import { changeUserPassword, formatExpireDate, getCurrentUser, getUserAccessState, logoutUser } from '@/utils/auth';

export default {
  name: "NavbarComponent",
  emits: ['open-auth-modal', 'open-payment-modal'],
  data() {
    return {
      username: null,
      isAdminUser: false,
      expireDateText: '',
      expireRemainingText: '',
      accessStatusText: '',
      accessStatusClass: '',
      isMobileDetailsOpen: false,
      showPasswordModal: false,
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      },
      passwordErrorMessage: '',
      isChangingPassword: false,
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
      const previousUsername = this.username;
      this.username = user ? user.username : null;
      this.isAdminUser = user?.role === 'admin';

      if (!this.username || (previousUsername && previousUsername !== this.username)) {
        this.isMobileDetailsOpen = false;
      }

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
      this.isMobileDetailsOpen = false;
      this.$router.push('/');
    },
    toggleMobileDetails() {
      this.isMobileDetailsOpen = !this.isMobileDetailsOpen;
    },
    openPasswordModal() {
      this.showPasswordModal = true;
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      };
      this.passwordErrorMessage = '';
    },
    closePasswordModal() {
      this.showPasswordModal = false;
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      };
      this.passwordErrorMessage = '';
    },
    async submitPasswordChange() {
      if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmNewPassword) {
        this.passwordErrorMessage = 'กรุณากรอกข้อมูลให้ครบ';
        return;
      }

      if (this.passwordForm.newPassword !== this.passwordForm.confirmNewPassword) {
        this.passwordErrorMessage = 'รหัสผ่านใหม่ไม่ตรงกัน';
        return;
      }

      if (this.passwordForm.newPassword.length < 6) {
        this.passwordErrorMessage = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
        return;
      }

      try {
        this.isChangingPassword = true;
        this.passwordErrorMessage = '';
        await changeUserPassword({
          currentPassword: this.passwordForm.currentPassword,
          newPassword: this.passwordForm.newPassword,
        });
        this.closePasswordModal();
        alert('เปลี่ยนรหัสผ่านสำเร็จ');
      } catch (error) {
        this.passwordErrorMessage = error.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้';
      } finally {
        this.isChangingPassword = false;
      }
    },
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
  gap: 0.75rem;
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

.user-panel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .user-panel {
    display: none;
  }

  .user-panel.mobile-open {
    display: flex;
  }
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

.mobile-user-toggle {
  display: none;
  border: none;
  background-color: #4b5563;
  color: white;
  padding: 0.35em 0.75em;
  border-radius: 5px;
  font-size: 0.8rem;
  cursor: pointer;
}

.desktop-only {
  display: none;
}

.mobile-only {
  display: none;
}

.mobile-login-button {
  border: none;
  background-color: #007bff;
  color: white;
  padding: 0.4em 0.75em;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85rem;
}

.change-password-button {
  border: none;
  background-color: #6b7280;
  color: white;
  padding: 0.3em 0.6em;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
}

.change-password-button:hover {
  background-color: #4b5563;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #111827;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  font-size: 0.875rem;
  color: #374151;
}

.form-control {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}

.action-row {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.primary-button {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.primary-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.secondary-button {
  background-color: #6b7280;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.secondary-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.payment-button {
  border: none;
  background-color: #2563eb;
  color: white;
  padding: 0.4em 0.75em;
  border-radius: 5px;
  font-size: 0.85rem;
  cursor: pointer;
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
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .payment-button {
    width: auto;
  }

  .mobile-only {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .user-info {
    margin-top: 0.5em;
    flex-direction: column;
    width: 100%;
  }

  .user-panel {
    flex-direction: column;
    gap: 0.5rem;
  }

  .user-meta {
    align-items: center;
    margin-bottom: 0;
  }

  .meta-detail-row {
    justify-content: center;
  }
}

@media (min-width: 769px) {
  .desktop-only {
    display: inline-flex;
    align-items: center;
  }

  .mobile-only {
    display: none;
  }
}
</style>
