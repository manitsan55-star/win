<template>
  <div class="admin-container">
    <h2>Admin Dashboard</h2>
    <div v-if="users.length > 0" class="user-list">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.role }}</td>
            <td>
              <!-- Add a delete button for each user -->
              <button @click="deleteUser(user.id)" class="delete-button">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else>
      <p>No users found</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AdminPage',
  data() {
    return {
      users: []
    };
  },
  created() {
    this.loadUsers();
  },
  methods: {
    async loadUsers() {
      try {
        const response = await axios.get('http://localhost:3000/users');
        this.users = response.data;
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    },
    async deleteUser(id) {
      try {
        await axios.delete(`http://localhost:3000/users/${id}`);
        // Refresh the user list after deletion
        this.loadUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
      }
    }
  }
};
</script>


<style scoped>
.admin-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2em;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

h2 {
  margin-bottom: 1em;
  font-size: 1.5em;
  text-align: center;
}

.user-list {
  margin-top: 1em;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75em;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f4f4f4;
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
</style>

