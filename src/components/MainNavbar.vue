<template>
  <nav class="navbar mb-4">
    <div class="navbar-brand">
      <span class="logo">WINWAI</span>
    </div>
    <div v-if="username" class="user-info">
      <span class="username">{{ username }}</span>
      <button @click="logout" class="logout-button">Logout</button>
    </div>
  </nav>
</template>

<script>
export default {
  name: "NavbarComponent",
  data() {
    return {
      username: null
    };
  },
  created() {
    this.loadUser();
  },
  methods: {
    loadUser() {
      const token = localStorage.getItem('token');
      if (token) {
        const user = JSON.parse(atob(token.split('.')[1]));
        this.username = user.username;
      }
    },
    logout() {
      localStorage.removeItem('token');
      this.username = null;
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

.logout-button {
  background-color: #ff4c4c;
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
