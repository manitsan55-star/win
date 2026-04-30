<template>
  <div class="admin-page">
    <MainNavbar @open-auth-modal="noop" />

    <div class="admin-container">
      <div class="header-row">
        <div>
          <h2>จัดการผู้ใช้</h2>
          <p class="subtitle">ผู้ใช้คนแรกที่สมัครจะได้ role เป็น admin อัตโนมัติ</p>
        </div>
        <button @click="loadUsers" class="refresh-button" :disabled="isLoading">
          {{ isLoading ? 'กำลังโหลด...' : 'รีเฟรช' }}
        </button>
      </div>

      <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
      <div v-if="successMessage" class="success-banner">{{ successMessage }}</div>

      <div v-if="users.length > 0" class="user-list">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.username }}</td>
              <td>
                <select
                  :value="user.role"
                  class="role-select"
                  :disabled="isBusy(user.id) || isCurrentUser(user.id)"
                  @change="changeRole(user, $event.target.value)"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
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
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        ยังไม่มีผู้ใช้ในระบบ
      </div>
    </div>
  </div>
</template>

<script>
import MainNavbar from './MainNavbar.vue';
import { deleteAdminUser, fetchAdminUsers, getCurrentUser, updateAdminUserRole } from '@/utils/auth';

export default {
  name: 'AdminPage',
  components: {
    MainNavbar,
  },
  data() {
    return {
      users: [],
      isLoading: false,
      pendingUserIds: [],
      errorMessage: '',
      successMessage: '',
      currentUserId: null,
    };
  },
  created() {
    this.currentUserId = getCurrentUser()?.id || null;
    this.loadUsers();
  },
  methods: {
    noop() {},
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
    async changeRole(user, role) {
      this.setBusy(user.id, true);
      this.errorMessage = '';
      this.successMessage = '';

      try {
        await updateAdminUserRole({ userId: user.id, role });
        this.users = this.users.map((item) =>
          item.id === user.id ? { ...item, role } : item
        );
        this.successMessage = `อัปเดต role ของ ${user.username} แล้ว`;
      } catch (err) {
        this.errorMessage = err.message || 'ไม่สามารถเปลี่ยน role ได้';
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
    formatDate(value) {
      if (!value) {
        return '-';
      }

      return new Date(value).toLocaleString();
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

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.refresh-button {
  border: none;
  background-color: #2563eb;
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
.role-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

