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

      <div v-if="activeTab === 'users' && !showAllUsers" class="load-all-row">
        <span class="load-all-hint">แสดง {{ users.length }} คนล่าสุด</span>
        <button @click="loadAllUsers" class="load-all-button" :disabled="isLoading">
          {{ isLoading ? 'กำลังโหลด...' : 'โหลดทั้งหมด' }}
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
          :class="['tab-button', { active: activeTab === 'create' }]"
          @click="activeTab = 'create'"
        >
          เพิ่มผู้ใช้
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

      <div v-if="activeTab === 'create'" class="create-user-card">
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
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-label">ผู้ใช้ทั้งหมด</span>
            <span class="stat-value">{{ userStats.total }}</span>
          </div>
          <div class="stat-card stat-active">
            <span class="stat-label">Active</span>
            <span class="stat-value">{{ userStats.active }}</span>
          </div>
          <div class="stat-card stat-inactive">
            <span class="stat-label">ไม่ Active</span>
            <span class="stat-value">{{ userStats.inactive }}</span>
          </div>
        </div>
        <div class="search-row">
          <input v-model.trim="searchQuery" type="text" placeholder="ค้นหา username..." class="search-input" />
          <button v-if="searchQuery" type="button" class="search-clear-button" @click="searchQuery = ''">ล้าง</button>
        </div>
        <label class="filter-toggle">
          <input v-model="showNewUsersWithSlipOnly" type="checkbox" />
          <span>แสดงเฉพาะ user ใหม่ที่อัปโหลดสลิปแล้ว (รอแก้วันหมดอายุ)</span>
        </label>
        <label class="filter-toggle">
          <input v-model="showUsersWithSlipOnly" type="checkbox" />
          <span>แสดง user ที่อัปโหลดสลิปแล้ว</span>
        </label>
        <label class="filter-toggle">
          <input v-model="showRenewalUsersWithSlipOnly" type="checkbox" />
          <span>แสดง user ที่ต่ออายุ</span>
        </label>
        <label class="filter-toggle">
          <input v-model="sortBySlipDate" type="checkbox" />
          <span>เรียงตาม slip ล่าสุด</span>
        </label>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Slip</th>
              <th>อนุมัติ</th>
              <th>Role</th>
              <th>Locked</th>
              <th>New User</th>
              <th>Expire Date</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in paginatedUsers" :key="user.id">
              <td>{{ user.username }}</td>
              <td>
                <div v-if="getLatestSlipForUser(user)" class="user-slip-cell">
                  <!-- New user: show image immediately -->
                  <template v-if="user.new_user">
                    <img v-if="getLatestSlipForUser(user).imageData" :src="getLatestSlipForUser(user).imageData" :alt="`สลิปของ ${user.username}`" class="user-slip-image" @click="openSlipModal(getLatestSlipForUser(user))" />
                    <div v-else class="user-slip-loading">กำลังโหลดรูป...</div>
                    <div class="user-slip-meta">
                      <span>{{ formatDate(getLatestSlipForUser(user).createdAt) }}</span>
                      <span :class="['slip-type-badge', getLatestSlipForUser(user).type]">{{ getLatestSlipForUser(user).type === 'renewal' ? 'ต่ออายุ' : 'สมัครใหม่' }}</span>
                    </div>
                  </template>
                  <!-- Existing user: click to view all slips -->
                  <template v-else>
                    <div class="user-slip-meta-existing">
                      <a
                        href="#"
                        class="slip-date-link"
                        @click.prevent="onSlipDateClick(user)"
                      >
                        ดูสลิป
                      </a>
                    </div>
                  </template>
                </div>
                <span v-else class="user-slip-empty">ยังไม่มีสลิป</span>
              </td>
              <td>
                <button
                  type="button"
                  class="approve-button"
                  :disabled="isBusy(user.id) || isCurrentUser(user.id)"
                  @click="approveUser31Days(user)"
                >
                  อนุมัติ 31 วัน
                </button>
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
                  <span>Locked</span>
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
                  <span>New User</span>
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

        <div v-if="totalPages > 1" class="pagination-row">
          <div class="pagination-info">
            หน้า {{ currentPage }} / {{ totalPages }} ({{ filteredUsers.length }} รายการ)
          </div>
          <div class="pagination-controls">
            <button type="button" :disabled="currentPage === 1" class="page-btn" @click="currentPage -= 1">ก่อนหน้า</button>
            <button
              v-for="page in totalPages"
              :key="page"
              type="button"
              :class="['page-btn', { active: page === currentPage }]"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
            <button type="button" :disabled="currentPage === totalPages" class="page-btn" @click="currentPage += 1">ถัดไป</button>
          </div>
          <div class="per-page-select">
            <label>แสดง:</label>
            <select v-model.number="itemsPerPage" class="page-size-select" @change="currentPage = 1">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
            <span>ต่อหน้า</span>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'users' && filteredUsers.length === 0" class="empty-state">
        {{ showNewUsersWithSlipOnly || showUsersWithSlipOnly || showRenewalUsersWithSlipOnly ? 'ไม่มี user ที่อัปโหลดสลิปแล้ว' : 'ยังไม่มีผู้ใช้ในระบบ' }}
      </div>
    </div>

    <div v-if="showSlipModal" class="slip-modal-overlay" @click="closeSlipModal">
      <div class="slip-modal-content" @click.stop>
        <div class="slip-modal-header">
          <h3>สลิปการโอนเงิน</h3>
          <button type="button" class="slip-modal-close" @click="closeSlipModal">✕</button>
        </div>
        <div class="slip-modal-body">
          <img v-if="selectedSlip?.imageData" :src="selectedSlip.imageData" alt="สลิป" class="slip-modal-image" />
          <div v-else-if="selectedSlip" class="slip-modal-no-image">ไม่พบรูปภาพ</div>
          <div v-if="selectedSlip" class="slip-modal-info">
            <p><strong>ผู้ใช้:</strong> {{ selectedSlip.username }}</p>
            <p><strong>เวลา:</strong> {{ formatDate(selectedSlip.createdAt) }}</p>
            <p><strong>ประเภท:</strong> <span :class="['slip-type-badge', selectedSlip.type]">{{ selectedSlip.type === 'renewal' ? 'ต่ออายุ' : 'สมัครใหม่' }}</span></p>
          </div>
        </div>
      </div>
    </div>

    <!-- Multi-slip modal for existing users -->
    <div v-if="showAllSlipsModal" class="slip-modal-overlay" @click="closeAllSlipsModal">
      <div class="slip-modal-content all-slips-modal" @click.stop>
        <div class="slip-modal-header">
          <h3>สลิปทั้งหมดของ {{ selectedUserForSlips?.username }}</h3>
          <button type="button" class="slip-modal-close" @click="closeAllSlipsModal">✕</button>
        </div>
        <div class="slip-modal-body all-slips-body">
          <div v-if="userAllSlips.length === 0" class="empty-slips">
            ไม่พบสลิป
          </div>
          <div v-for="slip in userAllSlips" :key="slip.id" class="slip-item">
            <div class="slip-item-header">
              <a
                href="#"
                class="slip-date-link-popup"
                :class="{
                  loading: isSlipLoading(slip.id),
                  renewal: slip.type === 'renewal',
                  active: visibleSlipImageIds.has(slip.id)
                }"
                @click.prevent="toggleSlipImage(slip)"
              >
                {{ formatDate(slip.createdAt) }}
              </a>
              <span :class="['slip-type-badge', slip.type]">{{ slip.type === 'renewal' ? 'ต่ออายุ' : 'สมัครใหม่' }}</span>
            </div>
            <div v-if="visibleSlipImageIds.has(slip.id)" class="slip-image-wrapper">
              <div v-if="isSlipLoading(slip.id)" class="slip-loading-indicator">
                กำลังโหลด...
              </div>
              <img
                v-else-if="slip.imageData"
                :src="slip.imageData"
                :alt="`สลิป ${slip.createdAt}`"
                class="slip-item-image"
              />
            </div>
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
import { adminResetUserPassword, createAdminUser, deleteAdminUser, fetchAdminUsers, getCurrentUser, getUserAccessState, isUserExpired, updateAdminUserAccess } from '@/utils/auth';
import { fetchAdminPaymentSettings, fetchAdminPaymentSlipById, fetchAdminPaymentSlipsMeta, readFileAsDataUrl, updateAdminPaymentSettings } from '@/utils/payment';

export default {
  name: 'AdminPage',
  components: {
    MainNavbar,
  },
  data() {
    return {
      users: [],
      userSlipsByUserId: {},
      allSlips: [],
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
      soundEnabled: true,
      audioContext: null,
      showSlipModal: false,
      selectedSlip: null,
      showAllSlipsModal: false,
      selectedUserForSlips: null,
      userAllSlips: [],
      loadingSlipIds: new Set(),
      visibleSlipImageIds: new Set(),
      showResetPasswordModal: false,
      resetPasswordUser: null,
      showNewUsersWithSlipOnly: false,
      showUsersWithSlipOnly: false,
      showRenewalUsersWithSlipOnly: false,
      sortBySlipDate: false,
      searchQuery: '',
      currentPage: 1,
      itemsPerPage: 10,
      showAllUsers: false,
      resetPasswordForm: {
        newPassword: '',
        confirmNewPassword: '',
      },
      resetPasswordErrorMessage: '',
      isResettingPassword: false,
    };
  },
  async created() {
    this.currentUserId = getCurrentUser()?.id || null;
    await this.loadUsers();
    this.loadPaymentSettings();
    await this.loadPaymentSlips();
  },
  mounted() {
    this.loadOneSignal();
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
      let result = [...this.users];

      if (this.sortBySlipDate) {
        result.sort((a, b) => {
          const slipA = this.getLatestSlipForUser(a);
          const slipB = this.getLatestSlipForUser(b);
          const timeA = slipA ? new Date(slipA.createdAt).getTime() : 0;
          const timeB = slipB ? new Date(slipB.createdAt).getTime() : 0;
          return timeB - timeA;
        });
      } else {
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        result = result.filter((user) => user.username.toLowerCase().includes(q));
      }
      if (this.showNewUsersWithSlipOnly) {
        result = result.filter((user) => user.new_user && this.getLatestSlipForUser(user));
      }
      if (this.showUsersWithSlipOnly) {
        result = result.filter((user) => this.getLatestSlipForUser(user));
      }
      if (this.showRenewalUsersWithSlipOnly) {
        result = result.filter((user) => {
          const slip = this.getLatestSlipForUser(user);
          return slip && slip.type === 'renewal';
        });
      }
      return result;
    },
    paginatedUsers() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredUsers.slice(start, end);
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.filteredUsers.length / this.itemsPerPage));
    },
    userStats() {
      const total = this.users.length;
      const active = this.users.filter((u) => !getUserAccessState(u).blocked).length;
      const inactive = total - active;
      return { total, active, inactive };
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

      if (this.activeTab === 'create') {
        return;
      }

      this.showAllUsers = false;
      await this.loadUsers();
      await this.loadPaymentSlips();
    },
    async loadUsers() {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const limit = this.showAllUsers ? null : 20;
        const fetchedUsers = await fetchAdminUsers(limit);
        this.users = fetchedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // If slips already loaded, load full images for new users
        if (Object.keys(this.userSlipsByUserId).length > 0) {
          await this.loadNewUserSlipImages();
        }
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถโหลดผู้ใช้ได้';
      } finally {
        this.isLoading = false;
      }
    },
    async loadAllUsers() {
      this.showAllUsers = true;
      await this.loadUsers();
      await this.loadPaymentSlips();
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
        const slips = await fetchAdminPaymentSlipsMeta();
        this.allSlips = slips;
        // Build map of latest slip per user (for new user display)
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

        // Load full images for new users
        if (this.users.length > 0) {
          await this.loadNewUserSlipImages();
        }

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
    async loadNewUserSlipImages() {
      const newUsersWithSlips = this.users.filter(
        (user) => user.new_user && this.userSlipsByUserId[user.id]
      );

      if (newUsersWithSlips.length === 0) {
        return;
      }

      await Promise.all(
        newUsersWithSlips.map(async (user) => {
          const slipMeta = this.userSlipsByUserId[user.id];
          if (!slipMeta || slipMeta.imageData || this.loadingSlipIds.has(slipMeta.id)) {
            return;
          }

          this.loadingSlipIds.add(slipMeta.id);
          try {
            const fullSlip = await fetchAdminPaymentSlipById(slipMeta.id);
            this.userSlipsByUserId[user.id] = fullSlip;
          } catch (err) {
            console.error('Failed to load new user slip:', err);
          } finally {
            this.loadingSlipIds.delete(slipMeta.id);
          }
        })
      );
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
    async approveUser31Days(user) {
      const hasValidExpireDate = user.expire_date && !isUserExpired(user);
      const baseDate = hasValidExpireDate ? new Date(user.expire_date) : new Date();
      baseDate.setDate(baseDate.getDate() + 31);
      const yyyy = baseDate.getFullYear();
      const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
      const dd = String(baseDate.getDate()).padStart(2, '0');
      const expireDate = `${yyyy}-${mm}-${dd}`;

      this.setBusy(user.id, true);
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const updatedUser = await updateAdminUserAccess({
          userId: user.id,
          locked: false,
          expire_date: expireDate,
        });
        this.replaceUser(updatedUser);
        this.successMessage = `อนุมัติ ${user.username} 31 วันแล้ว`;
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถอนุมัติ user ได้';
        await this.loadUsers();
      } finally {
        this.setBusy(user.id, false);
      }
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
    getAllSlipsForUser(user) {
      return this.allSlips.filter((slip) => slip.userId === user.id).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    },
    isSlipLoading(slipId) {
      return this.loadingSlipIds.has(slipId);
    },
    async onSlipDateClick(user) {
      // Open multi-slip modal showing all slips for this user
      this.openAllSlipsModal(user);
    },
    openAllSlipsModal(user) {
      this.selectedUserForSlips = user;
      this.userAllSlips = this.getAllSlipsForUser(user);
      this.showAllSlipsModal = true;
    },
    closeAllSlipsModal() {
      this.showAllSlipsModal = false;
      this.selectedUserForSlips = null;
      this.userAllSlips = [];
      this.visibleSlipImageIds.clear();
    },
    async toggleSlipImage(slip) {
      if (this.visibleSlipImageIds.has(slip.id)) {
        this.visibleSlipImageIds.delete(slip.id);
        return;
      }
      this.visibleSlipImageIds.add(slip.id);
      // Load image if not already loaded
      if (!slip.imageData && !this.loadingSlipIds.has(slip.id)) {
        await this.loadAndShowSlipImage(slip);
      }
    },
    async loadAndShowSlipImage(slip) {
      if (this.loadingSlipIds.has(slip.id)) {
        return;
      }
      this.loadingSlipIds.add(slip.id);
      try {
        const fullSlip = await fetchAdminPaymentSlipById(slip.id);
        // Update slip in userAllSlips array
        const index = this.userAllSlips.findIndex((s) => s.id === slip.id);
        if (index !== -1) {
          this.userAllSlips.splice(index, 1, fullSlip);
        }
        // Also update in allSlips
        const allIndex = this.allSlips.findIndex((s) => s.id === slip.id);
        if (allIndex !== -1) {
          this.allSlips.splice(allIndex, 1, fullSlip);
        }
      } catch (err) {
        console.error('Failed to load slip image:', err);
      } finally {
        this.loadingSlipIds.delete(slip.id);
      }
    },
    dismissNotification() {
      this.newSlipCount = 0;
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
    loadOneSignal() {
      if (document.getElementById('onesignal-sdk')) {
        console.log('[OneSignal] SDK already loaded');
        return;
      }
      console.log('[OneSignal] Loading SDK...');
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        console.log('[OneSignal] Deferred callback running');
        await OneSignal.init({
          appId: '3cfa6065-d6c2-4a49-b842-6dc840998ec6',
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: '/OneSignalSDKWorker.js',
        });
        console.log('[OneSignal] Init done');
        await OneSignal.User.addTag('role', 'admin');
        console.log('[OneSignal] Tag role=admin added');
        const permission = await OneSignal.Notifications.permissionNative;
        console.log('[OneSignal] Native permission:', permission);
      });
      const script = document.createElement('script');
      script.id = 'onesignal-sdk';
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.onload = () => console.log('[OneSignal] Script loaded');
      script.onerror = (e) => console.error('[OneSignal] Script failed to load', e);
      document.head.appendChild(script);
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

      return new Date(value).toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
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

.load-all-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: #f0f9ff;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.load-all-hint {
  color: #475569;
  font-size: 0.875rem;
}

.load-all-button {
  border: 1px solid #2563eb;
  background-color: white;
  color: #2563eb;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
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

.user-slip-meta-existing {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  color: #4b5563;
  font-size: 0.85rem;
  flex-wrap: wrap;
}

.user-slip-loading {
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  border-radius: 8px;
  color: #6b7280;
  font-size: 0.85rem;
}

.slip-date-link {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
}

.slip-date-link:hover {
  color: #1d4ed8;
}

.slip-date-link.loading {
  opacity: 0.6;
  cursor: wait;
}

.slip-date-link.renewal {
  color: #ea580c;
}

.slip-date-link.renewal:hover {
  color: #c2410c;
}

/* Popup date link styles */
.slip-date-link-popup {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 500;
}

.slip-date-link-popup:hover {
  color: #1d4ed8;
}

.slip-date-link-popup.loading {
  opacity: 0.6;
  cursor: wait;
}

.slip-date-link-popup.renewal {
  color: #ea580c;
}

.slip-date-link-popup.renewal:hover {
  color: #c2410c;
}

.slip-date-link-popup.active {
  font-weight: 700;
}

.slip-image-wrapper {
  margin-top: 0.5rem;
}

.slip-loading-indicator {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  background-color: #f3f4f6;
  border-radius: 6px;
}

.slip-type-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.35rem;
}

.slip-type-badge.signup {
  background-color: #dbeafe;
  color: #1e40af;
}

.slip-type-badge.renewal {
  background-color: #dcfce7;
  color: #166534;
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

.slip-modal-no-image {
  width: 100%;
  padding: 3rem 2rem;
  text-align: center;
  background-color: #f3f4f6;
  border-radius: 8px;
  color: #6b7280;
  font-size: 1rem;
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

/* Multi-slip modal styles */
.all-slips-modal {
  max-width: 800px;
  max-height: 90vh;
}

.all-slips-body {
  max-height: calc(90vh - 100px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.slip-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background-color: #f9fafb;
}

.slip-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: #374151;
}

.slip-item-image {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 6px;
  cursor: pointer;
  background-color: white;
}

.empty-slips {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
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

.stats-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 120px;
  background: white;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
}

.stat-card.stat-active {
  border-color: #a7f3d0;
  background: #f0fdf4;
}

.stat-card.stat-inactive {
  border-color: #fecaca;
  background: #fef2f2;
}

.stat-label {
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #111827;
}

.stat-active .stat-value {
  color: #059669;
}

.stat-inactive .stat-value {
  color: #dc2626;
}

.user-list {
  margin-top: 1em;
  overflow-x: auto;
}

.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.pagination-info {
  font-size: 0.85rem;
  color: #6b7280;
}

.pagination-controls {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.page-btn {
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  padding: 0.35rem 0.65rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85rem;
  min-width: 2rem;
}

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.per-page-select {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #374151;
}

.page-size-select {
  padding: 0.3rem 0.5rem;
  border-radius: 5px;
  border: 1px solid #d1d5db;
  font-size: 0.85rem;
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

.search-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.search-input {
  width: 100%;
  max-width: 320px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.search-clear-button {
  border: none;
  background-color: #6b7280;
  color: white;
  padding: 0.45rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.search-clear-button:hover {
  background-color: #4b5563;
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

.approve-button {
  border: none;
  background-color: #10b981;
  color: white;
  padding: 0.4em 0.6em;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
}

.approve-button:hover:not(:disabled) {
  background-color: #059669;
}

.approve-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.delete-button {
  background-color: #dc3545;
}

.delete-button:hover {
  background-color: #c82333;
}

.delete-button:disabled,
.refresh-button:disabled,
.load-all-button:disabled,
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

