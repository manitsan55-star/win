<template>
  <div class="admin-page">
    <MainNavbar @open-auth-modal="noop" />

    <div class="admin-container">
      <div class="header-row">
        <div>
          <h2>{{ activeTab === 'users' ? 'จัดการผู้ใช้' : 'ตั้งค่าวิธีชำระเงิน' }}</h2>
          <p class="subtitle">{{ activeTab === 'users' ? 'ตรวจสลิปของแต่ละคนและตั้งวันหมดอายุได้จากตารางผู้ใช้' : 'อัปโหลด QR Code และแก้ข้อความวิธีชำระเงินสำหรับผู้ใช้' }}</p>
          <div class="notification-controls">
            <div v-if="newSlipCount > 0" class="notification-badge" @click="dismissNotification">
              มีสลิปใหม่ {{ newSlipCount }} รายการ (คลิกเพื่อปิดแจ้งเตือน)
            </div>
            <button type="button" class="sound-toggle-button" @click="toggleSound" :title="soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'">
              {{ soundEnabled ? '🔊' : '🔇' }}
            </button>
          </div>
        </div>
        <button @click="refreshActiveTab" class="refresh-button" :disabled="isRefreshDisabled">
          {{ refreshButtonText }}
        </button>
      </div>

      <div class="tabs-row">
        <button
          type="button"
          :class="['tab-button', { active: activeTab === 'users' }]"
          @click="activeTab = 'users'"
        >
          จัดการผู้ใช้
        </button>
        <button
          type="button"
          :class="['tab-button', { active: activeTab === 'payment' }]"
          @click="activeTab = 'payment'"
        >
          ตั้งค่าวิธีชำระเงิน
        </button>
      </div>

      <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
      <div v-if="successMessage" class="success-banner">{{ successMessage }}</div>

      <div v-if="activeTab === 'payment'" class="payment-settings-card">
        <h3>ตั้งค่าวิธีชำระเงิน</h3>
        <div class="payment-settings-grid">
          <div class="payment-message-group">
            <label class="field-label" for="payment-message">คำอธิบายวิธีชำระเงิน</label>
            <textarea
              id="payment-message"
              v-model="paymentSettings.paymentMessage"
              class="payment-message-input"
              :disabled="isSavingPaymentSettings"
            ></textarea>
          </div>

          <div class="payment-upload-card">
            <div class="payment-upload-header">
              <span class="field-label">QR Code โอนเงิน</span>
              <button
                type="button"
                class="clear-button"
                :disabled="isSavingPaymentSettings || !paymentSettings.transferQrImage"
                @click="clearPaymentImage('transferQrImage')"
              >
                ล้าง
              </button>
            </div>
            <input type="file" accept="image/*" class="form-input" :disabled="isSavingPaymentSettings" @change="handlePaymentImageChange($event, 'transferQrImage')" />
            <img v-if="paymentSettings.transferQrImage" :src="paymentSettings.transferQrImage" alt="QR Code โอนเงิน" class="payment-preview-image" />
            <div v-else class="payment-preview-placeholder">ยังไม่ได้อัปโหลด QR Code โอนเงิน</div>
          </div>
        </div>
        <button @click="savePaymentSettings" class="create-button payment-save-button" :disabled="isSavingPaymentSettings">
          {{ isSavingPaymentSettings ? 'กำลังบันทึก...' : 'บันทึกวิธีชำระเงิน' }}
        </button>
      </div>

      <div v-if="activeTab === 'users'" class="create-user-card">
        <h3>เพิ่มผู้ใช้</h3>
        <div class="create-user-grid">
          <input
            v-model.trim="createForm.username"
            type="text"
            class="form-input"
            placeholder="Username"
            :disabled="isCreatingUser"
          />
          <input
            v-model="createForm.password"
            type="password"
            class="form-input"
            placeholder="Password"
            :disabled="isCreatingUser"
          />
          <select v-model="createForm.role" class="form-input" :disabled="isCreatingUser">
            <option value="user">user</option>
            <option value="vip">vip</option>
            <option value="admin">admin</option>
          </select>
          <input
            v-model="createForm.expire_date"
            type="date"
            class="form-input"
            :disabled="isCreatingUser"
          />
          <label class="lock-toggle create-lock-toggle">
            <input v-model="createForm.locked" type="checkbox" :disabled="isCreatingUser" />
            <span>สร้างเป็น locked</span>
          </label>
          <button @click="createUser" class="create-button" :disabled="isCreatingUser">
            {{ isCreatingUser ? 'กำลังสร้าง...' : 'เพิ่ม user' }}
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'users' && users.length > 0" class="user-list">
        <label class="filter-toggle">
          <input v-model="showNewUsersWithSlipOnly" type="checkbox" />
          <span>แสดงเฉพาะ user ใหม่ที่อัปโหลดสลิปแล้ว (รอแก้วันหมดอายุ)</span>
        </label>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Slip</th>
              <th>Role</th>
              <th>Locked</th>
              <th>New User</th>
              <th>Expire Date</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>{{ user.username }}</td>
              <td>
                <div v-if="getLatestSlipForUser(user)" class="user-slip-cell">
                  <img :src="getLatestSlipForUser(user).imageData" :alt="`สลิปของ ${user.username}`" class="user-slip-image" @click="openSlipModal(getLatestSlipForUser(user))" />
                  <div class="user-slip-meta">
                    <span>{{ formatDate(getLatestSlipForUser(user).createdAt) }}</span>
                  </div>
                </div>
                <span v-else class="user-slip-empty">ยังไม่มีสลิป</span>
              </td>
              <td>
                <select
                  :value="user.role"
                  class="role-select"
                  :disabled="isBusy(user.id) || isCurrentUser(user.id)"
                  @change="changeRole(user, $event.target.value)"
                >
                  <option value="vip">vip</option>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td>
                <label class="lock-toggle">
                  <input
                    type="checkbox"
                    :checked="user.locked"
                    :disabled="isBusy(user.id) || isCurrentUser(user.id)"
                    @change="changeLocked(user, $event.target.checked)"
                  />
                  <span>{{ user.locked ? 'locked' : 'active' }}</span>
                </label>
              </td>
              <td>
                <label class="lock-toggle">
                  <input
                    type="checkbox"
                    :checked="user.new_user"
                    :disabled="isBusy(user.id)"
                    @change="changeNewUser(user, $event.target.checked)"
                  />
                  <span>{{ user.new_user ? 'new' : 'paid' }}</span>
                </label>
              </td>
              <td>
                <input
                  type="date"
                  class="expire-input"
                  :value="toDateInput(user.expire_date)"
                  :disabled="isBusy(user.id) || isCurrentUser(user.id)"
                  @change="changeExpireDate(user, $event.target.value)"
                />
                <button
                  class="clear-button"
                  :disabled="isBusy(user.id) || isCurrentUser(user.id) || !user.expire_date"
                  @click="clearExpireDate(user)"
                >
                  ล้าง
                </button>
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
              <td>
                <button
                  @click="deleteUser(user)"
                  class="delete-button"
                  :disabled="isBusy(user.id) || isCurrentUser(user.id)"
                >
                  ลบผู้ใช้
                </button>
                <button
                  @click="openResetPasswordModal(user)"
                  class="reset-password-button"
                  :disabled="isBusy(user.id) || isCurrentUser(user.id)"
                >
                  รีเซ็ตรหัสผ่าน
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'users' && filteredUsers.length === 0" class="empty-state">
        {{ showNewUsersWithSlipOnly ? 'ไม่มี user ใหม่ที่อัปโหลดสลิปแล้ว' : 'ยังไม่มีผู้ใช้ในระบบ' }}
      </div>
    </div>

    <div v-if="showSlipModal" class="slip-modal-overlay" @click="closeSlipModal">
      <div class="slip-modal-content" @click.stop>
        <div class="slip-modal-header">
          <h3>สลิปการโอนเงิน</h3>
          <button type="button" class="slip-modal-close" @click="closeSlipModal">✕</button>
        </div>
        <div class="slip-modal-body">
          <img v-if="selectedSlip" :src="selectedSlip.imageData" alt="สลิป" class="slip-modal-image" />
          <div v-if="selectedSlip" class="slip-modal-info">
            <p><strong>ผู้ใช้:</strong> {{ selectedSlip.username }}</p>
            <p><strong>เวลา:</strong> {{ formatDate(selectedSlip.createdAt) }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showResetPasswordModal" class="modal-overlay" @click="closeResetPasswordModal">
      <div class="modal-card" @click.stop>
        <h3>รีเซ็ตรหัสผ่าน</h3>
        <form @submit.prevent="submitResetPassword" class="auth-form">
          <div class="form-group">
            <label for="reset-new-password">รหัสผ่านใหม่</label>
            <input id="reset-new-password" v-model="resetPasswordForm.newPassword" type="password" class="form-control" />
          </div>
          <div class="form-group">
            <label for="reset-confirm-new-password">ยืนยันรหัสผ่านใหม่</label>
            <input id="reset-confirm-new-password" v-model="resetPasswordForm.confirmNewPassword" type="password" class="form-control" />
          </div>
          <div v-if="resetPasswordErrorMessage" class="error-message">{{ resetPasswordErrorMessage }}</div>
          <div class="action-row">
            <button type="button" class="secondary-button" :disabled="isResettingPassword" @click="closeResetPasswordModal">ยกเลิก</button>
            <button type="submit" class="primary-button" :disabled="isResettingPassword">{{ isResettingPassword ? 'กำลังรีเซ็ต...' : 'รีเซ็ตรหัสผ่าน' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import MainNavbar from './MainNavbar.vue';
import { adminResetUserPassword, createAdminUser, deleteAdminUser, fetchAdminUsers, getCurrentUser, updateAdminUserAccess } from '@/utils/auth';
import { fetchAdminPaymentSettings, fetchAdminPaymentSlips, readFileAsDataUrl, updateAdminPaymentSettings } from '@/utils/payment';

export default {
  name: 'AdminPage',
  components: {
    MainNavbar,
  },
  data() {
    return {
      users: [],
      userSlipsByUserId: {},
      isLoading: false,
      pendingUserIds: [],
      errorMessage: '',
      successMessage: '',
      currentUserId: null,
      activeTab: 'users',
      isCreatingUser: false,
      isSavingPaymentSettings: false,
      paymentSettings: {
        transferQrImage: '',
        paymentMessage: 'กรุณาโอนเงินตาม QR Code และอัปโหลดสลิปการโอนเงินด้านล่าง',
      },
      createForm: {
        username: '',
        password: '',
        role: 'user',
        locked: false,
        expire_date: '',
      },
      lastCheckedSlipTimestamp: null,
      newSlipCount: 0,
      slipPollingInterval: null,
      soundEnabled: true,
      audioContext: null,
      showSlipModal: false,
      selectedSlip: null,
      showResetPasswordModal: false,
      resetPasswordUser: null,
      showNewUsersWithSlipOnly: false,
      resetPasswordForm: {
        newPassword: '',
        confirmNewPassword: '',
      },
      resetPasswordErrorMessage: '',
      isResettingPassword: false,
    };
  },
  created() {
    this.currentUserId = getCurrentUser()?.id || null;
    this.loadUsers();
    this.loadPaymentSettings();
    this.loadPaymentSlips();
    this.startSlipPolling();
  },
  beforeUnmount() {
    this.stopSlipPolling();
  },
  computed: {
    refreshButtonText() {
      if (this.activeTab === 'users') {
        return this.isLoading ? 'กำลังโหลด...' : 'รีเฟรช';
      }

      return this.isSavingPaymentSettings ? 'กำลังโหลด...' : 'รีเฟรช';
    },
    isRefreshDisabled() {
      return this.activeTab === 'users' ? this.isLoading : this.isSavingPaymentSettings;
    },
    filteredUsers() {
      if (!this.showNewUsersWithSlipOnly) {
        return this.users;
      }
      return this.users.filter((user) => user.new_user && this.getLatestSlipForUser(user));
    },
  },
  methods: {
    noop() {},
    async refreshActiveTab() {
      this.errorMessage = '';

      if (this.activeTab === 'payment') {
        await this.loadPaymentSettings();
        return;
      }

      await Promise.all([this.loadUsers(), this.loadPaymentSlips()]);
    },
    async loadUsers() {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        this.users = await fetchAdminUsers();
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถโหลดผู้ใช้ได้';
      } finally {
        this.isLoading = false;
      }
    },
    async loadPaymentSettings() {
      try {
        this.paymentSettings = await fetchAdminPaymentSettings();
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถโหลดข้อมูลการชำระเงินได้';
      }
    },
    async loadPaymentSlips() {
      try {
        const slips = await fetchAdminPaymentSlips();
        this.userSlipsByUserId = slips.reduce((result, slip) => {
          if (!slip?.userId) {
            return result;
          }

          const currentSlip = result[slip.userId];

          if (!currentSlip || new Date(slip.createdAt).getTime() > new Date(currentSlip.createdAt).getTime()) {
            result[slip.userId] = slip;
          }

          return result;
        }, {});

        if (this.lastCheckedSlipTimestamp) {
          this.newSlipCount = slips.filter((slip) => new Date(slip.createdAt).getTime() > this.lastCheckedSlipTimestamp).length;
          if (this.newSlipCount > 0) {
            this.playNotificationSound();
          }
        }

        if (slips.length > 0) {
          const latestTimestamp = Math.max(...slips.map((slip) => new Date(slip.createdAt).getTime()));
          this.lastCheckedSlipTimestamp = latestTimestamp;
        }
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถโหลดสลิปการโอนเงินได้';
      }
    },
    async handlePaymentImageChange(event, field) {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        this.paymentSettings = {
          ...this.paymentSettings,
          [field]: dataUrl,
        };
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถอ่านไฟล์รูปภาพได้';
      } finally {
        event.target.value = '';
      }
    },
    clearPaymentImage(field) {
      this.paymentSettings = {
        ...this.paymentSettings,
        [field]: '',
      };
    },
    async savePaymentSettings() {
      this.isSavingPaymentSettings = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        this.paymentSettings = await updateAdminPaymentSettings(this.paymentSettings);
        this.successMessage = 'บันทึกวิธีชำระเงินแล้ว';
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถบันทึกวิธีชำระเงินได้';
      } finally {
        this.isSavingPaymentSettings = false;
      }
    },
    async createUser() {
      this.isCreatingUser = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const createdUser = await createAdminUser({
          username: this.createForm.username,
          password: this.createForm.password,
          role: this.createForm.role,
          locked: this.createForm.locked,
          expire_date: this.createForm.expire_date || null,
        });

        this.users = [...this.users, createdUser].sort((a, b) => a.username.localeCompare(b.username));
        this.successMessage = `เพิ่มผู้ใช้ ${createdUser.username} แล้ว`;
        this.resetCreateForm();
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถเพิ่มผู้ใช้ได้';
      } finally {
        this.isCreatingUser = false;
      }
    },
    async changeRole(user, role) {
      this.setBusy(user.id, true);
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const updatedUser = await updateAdminUserAccess({ userId: user.id, role });
        this.replaceUser(updatedUser);
        this.successMessage = `อัปเดต role ของ ${user.username} แล้ว`;
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถเปลี่ยน role ได้';
        await this.loadUsers();
      } finally {
        this.setBusy(user.id, false);
      }
    },
    async changeNewUser(user, newUser) {
      this.setBusy(user.id, true);
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const updatedUser = await updateAdminUserAccess({ userId: user.id, new_user: newUser });
        this.replaceUser(updatedUser);
        this.successMessage = `อัปเดตสถานะ new user ของ ${user.username} แล้ว`;
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถอัปเดตสถานะ new user ได้';
        await this.loadUsers();
      } finally {
        this.setBusy(user.id, false);
      }
    },
    async changeLocked(user, locked) {
      this.setBusy(user.id, true);
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const updatedUser = await updateAdminUserAccess({ userId: user.id, locked });
        this.replaceUser(updatedUser);
        this.successMessage = `อัปเดตสถานะของ ${user.username} แล้ว`;
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถเปลี่ยนสถานะ locked ได้';
        await this.loadUsers();
      } finally {
        this.setBusy(user.id, false);
      }
    },
    async changeExpireDate(user, expireDate) {
      this.setBusy(user.id, true);
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const updatedUser = await updateAdminUserAccess({
          userId: user.id,
          expire_date: expireDate || null,
        });
        this.replaceUser(updatedUser);
        this.successMessage = `อัปเดตวันหมดอายุของ ${user.username} แล้ว`;
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถอัปเดต expire_date ได้';
        await this.loadUsers();
      } finally {
        this.setBusy(user.id, false);
      }
    },
    clearExpireDate(user) {
      this.changeExpireDate(user, '');
    },
    async deleteUser(user) {
      this.setBusy(user.id, true);
      this.errorMessage = '';
      this.successMessage = '';

      try {
        await deleteAdminUser(user.id);
        this.users = this.users.filter((item) => item.id !== user.id);
        this.successMessage = `ลบ ${user.username} แล้ว`;
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถลบผู้ใช้ได้';
      } finally {
        this.setBusy(user.id, false);
      }
    },
    setBusy(userId, isBusy) {
      if (isBusy) {
        this.pendingUserIds = [...new Set([...this.pendingUserIds, userId])];
        return;
      }

      this.pendingUserIds = this.pendingUserIds.filter((id) => id !== userId);
    },
    isBusy(userId) {
      return this.pendingUserIds.includes(userId);
    },
    isCurrentUser(userId) {
      return this.currentUserId === userId;
    },
    getLatestSlipForUser(user) {
      return this.userSlipsByUserId[user.id] || null;
    },
    dismissNotification() {
      this.newSlipCount = 0;
    },
    startSlipPolling() {
      this.stopSlipPolling();
      this.slipPollingInterval = setInterval(() => {
        this.loadPaymentSlips();
      }, 30000);
    },
    stopSlipPolling() {
      if (this.slipPollingInterval) {
        clearInterval(this.slipPollingInterval);
        this.slipPollingInterval = null;
      }
    },
    playNotificationSound() {
      if (!this.soundEnabled) {
        return;
      }

      try {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }
    },
    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
    },
    openSlipModal(slip) {
      this.selectedSlip = slip;
      this.showSlipModal = true;
    },
    closeSlipModal() {
      this.showSlipModal = false;
      this.selectedSlip = null;
    },
    openResetPasswordModal(user) {
      this.resetPasswordUser = user;
      this.resetPasswordForm = {
        newPassword: '',
        confirmNewPassword: '',
      };
      this.resetPasswordErrorMessage = '';
      this.showResetPasswordModal = true;
    },
    closeResetPasswordModal() {
      this.showResetPasswordModal = false;
      this.resetPasswordUser = null;
      this.resetPasswordForm = {
        newPassword: '',
        confirmNewPassword: '',
      };
      this.resetPasswordErrorMessage = '';
    },
    async submitResetPassword() {
      if (!this.resetPasswordForm.newPassword || !this.resetPasswordForm.confirmNewPassword) {
        this.resetPasswordErrorMessage = 'กรุณากรอกข้อมูลให้ครบ';
        return;
      }

      if (this.resetPasswordForm.newPassword !== this.resetPasswordForm.confirmNewPassword) {
        this.resetPasswordErrorMessage = 'รหัสผ่านใหม่ไม่ตรงกัน';
        return;
      }

      try {
        this.isResettingPassword = true;
        this.resetPasswordErrorMessage = '';
        await adminResetUserPassword({
          userId: this.resetPasswordUser.id,
          newPassword: this.resetPasswordForm.newPassword,
        });
        this.closeResetPasswordModal();
        alert('รีเซ็ตรหัสผ่านสำเร็จ');
      } catch (error) {
        this.resetPasswordErrorMessage = error.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้';
      } finally {
        this.isResettingPassword = false;
      }
    },
    resetCreateForm() {
      this.createForm = {
        username: '',
        password: '',
        role: 'user',
        locked: false,
        expire_date: '',
      };
    },
    replaceUser(updatedUser) {
      this.users = this.users.map((item) =>
        item.id === updatedUser.id ? updatedUser : item
      );
    },
    formatDate(value) {
      if (!value) {
        return '-';
      }

      return new Date(value).toLocaleString();
    },
    toDateInput(value) {
      if (!value) {
        return '';
      }

      return value;
    }
  }
};
</script>


<style scoped>
.admin-page {
  min-height: 100vh;
  background-color: #f3f4f6;
}

.admin-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2em;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-top: 1.5rem;
}

h2 {
  margin-bottom: 0.25em;
  font-size: 1.5em;
}

.subtitle {
  margin-top: 0;
  color: #4b5563;
}

.notification-badge {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  color: #92400e;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-badge:hover {
  background-color: #fde68a;
}

.notification-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.sound-toggle-button {
  border: none;
  background-color: white;
  color: #374151;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: background-color 0.2s;
}

.sound-toggle-button:hover {
  background-color: #f3f4f6;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.tabs-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.tab-button {
  border: 1px solid #d1d5db;
  background-color: white;
  color: #374151;
  padding: 0.7rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.tab-button.active {
  background-color: #2563eb;
  border-color: #2563eb;
  color: white;
}

.refresh-button {
  border: none;
  background-color: #2563eb;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.create-user-card {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.payment-settings-card {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.payment-settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.payment-message-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-weight: 600;
  color: #374151;
}

.payment-message-input {
  min-height: 140px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.75rem;
  resize: vertical;
}

.payment-upload-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  background-color: #f9fafb;
}

.payment-upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.payment-preview-image {
  width: 100%;
  max-height: 280px;
  object-fit: contain;
  border-radius: 8px;
  background-color: white;
}

.payment-preview-placeholder {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #6b7280;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  background-color: white;
  padding: 1rem;
}

.payment-save-button {
  min-width: 200px;
}

.user-slip-cell {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 150px;
}

.user-slip-image {
  width: 150px;
  height: 150px;
  object-fit: contain;
  border-radius: 8px;
  background-color: white;
  border: 1px solid #e5e7eb;
}

.user-slip-meta {
  color: #4b5563;
  font-size: 0.85rem;
}

.user-slip-empty {
  color: #6b7280;
}

.user-slip-image {
  width: 150px;
  height: 150px;
  object-fit: contain;
  border-radius: 8px;
  background-color: white;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: transform 0.2s;
}

.user-slip-image:hover {
  transform: scale(1.05);
  border-color: #2563eb;
}

.slip-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background-color: white;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  padding: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-card h3 {
  margin: 0 0 20px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.modal-card .auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-card .form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-card .form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.modal-card .form-control {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.modal-card .form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-card .error-message {
  color: #ef4444;
  font-size: 0.875rem;
  background-color: #fef2f2;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #fecaca;
}

.modal-card .action-row {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

.modal-card .primary-button {
  padding: 10px 20px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.modal-card .primary-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.modal-card .primary-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.modal-card .secondary-button {
  padding: 10px 20px;
  background-color: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.modal-card .secondary-button:hover:not(:disabled) {
  background-color: #4b5563;
}

.modal-card .secondary-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.slip-modal-content {
  background-color: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.slip-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.slip-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

.slip-modal-close {
  border: none;
  background-color: transparent;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem 0.5rem;
  line-height: 1;
}

.slip-modal-close:hover {
  color: #111827;
}

.slip-modal-body {
  padding: 1.5rem;
}

.slip-modal-image {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
  background-color: white;
}

.slip-modal-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.slip-modal-info p {
  margin: 0.5rem 0;
  color: #374151;
}

.slip-modal-body .form-group {
  margin-top: 1rem;
}

.slip-modal-body .form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: #374151;
}

.slip-modal-body .form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.slip-modal-body .error-message {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.slip-modal-body .action-row {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.slip-modal-body .primary-button {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.slip-modal-body .primary-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.slip-modal-body .secondary-button {
  background-color: #6b7280;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.slip-modal-body .secondary-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.reset-password-button {
  margin-right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.reset-password-button:hover {
  background-color: #4b5563;
}

.reset-password-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.create-user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  align-items: center;
}

.form-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.65rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
}

.create-lock-toggle {
  min-height: 42px;
}

.create-button {
  border: none;
  background-color: #059669;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.user-list {
  margin-top: 1em;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
}

th, td {
  padding: 0.75em;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f4f4f4;
}

.role-select {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
}

.lock-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  color: #374151;
  cursor: pointer;
}

.expire-input {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  margin-right: 0.5rem;
}

.clear-button {
  border: none;
  background-color: #6b7280;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
}

.error-banner,
.success-banner,
.empty-state {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
}

.success-banner {
  background-color: #dcfce7;
  color: #166534;
}

.empty-state {
  background-color: white;
  color: #4b5563;
}

.view-button, .delete-button {
  border: none;
  padding: 0.5em 1em;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  color: white;
}

.view-button {
  background-color: #007bff;
}

.view-button:hover {
  background-color: #0056b3;
}

.delete-button {
  background-color: #dc3545;
}

.delete-button:hover {
  background-color: #c82333;
}

.delete-button:disabled,
.refresh-button:disabled,
.create-button:disabled,
.form-input:disabled,
.payment-message-input:disabled,
.role-select:disabled,
.expire-input:disabled,
.clear-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

