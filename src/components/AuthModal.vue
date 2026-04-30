<template>
  <div v-if="open" class="modal-overlay" @click.self="closeModal">
    <div class="modal-card">
      <div class="mode-switcher">
        <button
          :class="['mode-button', { active: activeMode === 'login' }]"
          @click="setMode('login')"
        >
          เข้าสู่ระบบ
        </button>
        <button
          :class="['mode-button', { active: activeMode === 'register' }]"
          @click="setMode('register')"
        >
          สมัครสมาชิก
        </button>
      </div>

      <h2 class="modal-title">
        {{ activeMode === 'login' ? 'เข้าสู่ระบบก่อนคำนวณ' : 'สมัครสมาชิก' }}
      </h2>

      <form v-if="activeMode === 'login'" @submit.prevent="submitLogin" class="auth-form">
        <div class="form-group">
          <label for="login-username">Username</label>
          <input id="login-username" v-model="loginForm.username" type="text" class="form-control" />
        </div>

        <div class="form-group">
          <label for="login-password">Password</label>
          <input id="login-password" v-model="loginForm.password" type="password" class="form-control" />
        </div>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

        <div class="action-row">
          <button type="button" class="secondary-button" :disabled="isSubmitting" @click="closeModal">ยกเลิก</button>
          <button type="submit" class="primary-button" :disabled="isSubmitting">{{ isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}</button>
        </div>
      </form>

      <form v-else @submit.prevent="submitRegister" class="auth-form">
        <div class="form-group">
          <label for="register-username">Username</label>
          <input id="register-username" v-model="registerForm.username" type="text" class="form-control" />
        </div>

        <div class="form-group">
          <label for="register-password">Password</label>
          <input id="register-password" v-model="registerForm.password" type="password" class="form-control" />
        </div>

        <div class="form-group">
          <label for="register-confirm-password">Confirm Password</label>
          <input id="register-confirm-password" v-model="registerForm.confirmPassword" type="password" class="form-control" />
        </div>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

        <div class="action-row">
          <button type="button" class="secondary-button" :disabled="isSubmitting" @click="closeModal">ยกเลิก</button>
          <button type="submit" class="primary-button" :disabled="isSubmitting">{{ isSubmitting ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { loginUser, registerUser } from '@/utils/auth';

export default {
  name: 'AuthModal',
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    initialMode: {
      type: String,
      default: 'login',
    },
  },
  emits: ['close', 'auth-success'],
  data() {
    return {
      activeMode: 'login',
      errorMessage: '',
      isSubmitting: false,
      loginForm: {
        username: '',
        password: '',
      },
      registerForm: {
        username: '',
        password: '',
        confirmPassword: '',
      },
    };
  },
  watch: {
    initialMode: {
      immediate: true,
      handler(value) {
        this.activeMode = value === 'register' ? 'register' : 'login';
        this.errorMessage = '';
      },
    },
    open(value) {
      if (value) {
        this.errorMessage = '';
      }
    },
  },
  methods: {
    setMode(mode) {
      this.activeMode = mode;
      this.errorMessage = '';
    },
    closeModal() {
      if (this.isSubmitting) {
        return;
      }

      this.errorMessage = '';
      this.$emit('close');
    },
    async submitLogin() {
      this.isSubmitting = true;

      try {
        const user = await loginUser(this.loginForm);
        this.resetForms();
        this.$emit('auth-success', user);
      } catch (error) {
        this.errorMessage = error.message;
      } finally {
        this.isSubmitting = false;
      }
    },
    async submitRegister() {
      this.isSubmitting = true;

      try {
        const user = await registerUser(this.registerForm);
        this.resetForms();
        this.$emit('auth-success', user);
      } catch (error) {
        this.errorMessage = error.message;
      } finally {
        this.isSubmitting = false;
      }
    },
    resetForms() {
      this.errorMessage = '';
      this.isSubmitting = false;
      this.loginForm = {
        username: '',
        password: '',
      };
      this.registerForm = {
        username: '',
        password: '',
        confirmPassword: '',
      };
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-card {
  width: 100%;
  max-width: 420px;
  background-color: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.mode-switcher {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.mode-button {
  border: 1px solid #d1d5db;
  background-color: #f3f4f6;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
}

.mode-button.active {
  background-color: #2563eb;
  color: white;
  border-color: #2563eb;
}

.modal-title {
  margin-top: 0;
  margin-bottom: 1rem;
  text-align: center;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-control {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.75rem;
}

.error-message {
  color: #dc2626;
  font-size: 0.95rem;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.primary-button,
.secondary-button {
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.primary-button {
  background-color: #16a34a;
  color: white;
}

.secondary-button {
  background-color: #e5e7eb;
  color: #111827;
}
</style>
