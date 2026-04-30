<template>
  <div class="register-container">
    <h2>Register</h2>
    <form @submit.prevent="register" class="register-form">
      <div class="form-group">
        <label for="username">Username:</label>
        <input v-model="username" type="text" id="username" class="form-control" />
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input v-model="password" type="password" id="password" class="form-control" />
      </div>
      <div class="form-group">
        <label for="confirmPassword">Confirm Password:</label>
        <input v-model="confirmPassword" type="password" id="confirmPassword" class="form-control" />
      </div>
      <button type="submit" class="submit-button">Register</button>
    </form>
    <div v-if="error" class="error-message">{{ error }}</div>
    <p class="login-link"><router-link to="/">เข้าสู่ระบบ</router-link></p>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "RegisterPage",
  data() {
    return {
      username: '',
      password: '',
      confirmPassword: '',
      error: ''
    };
  },
  methods: {
    async register() {
      if (this.password !== this.confirmPassword) {
        this.error = 'Passwords do not match';
        return;
      }

      try {
        await axios.post('http://localhost:3000/register', {
          username: this.username,
          password: this.password,
          role: 'user'
        });
        this.$router.push('/login');
      } catch (err) {
        this.error = err.response.data.error || 'Registration failed';
      }
    }
  }
};
</script>

<style scoped>
.register-container {
  max-width: 400px;
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

.register-form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 1em;
}

.label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: bold;
}

.form-control {
  width: 100%;
  padding: 0.75em;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.submit-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.75em;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.submit-button:hover {
  background-color: #0056b3;
}

.error-message {
  color: #ff4c4c;
  margin-top: 1em;
  text-align: center;
}

.login-link {
  margin-top: 1em;
  text-align: center;
}

.login-link a {
  color: #007bff;
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
