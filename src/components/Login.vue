<template>
  <div class="login-container">
    <h2>เข้าสู่ระบบ</h2>
    <form @submit.prevent="login" class="login-form">
      <div class="form-group">
        <label for="username">ชื่อผู้ใช้:</label>
        <input v-model="username" type="text" id="username" class="form-control" />
      </div>
      <div class="form-group">
        <label for="password">รหัสผ่าน:</label>
        <input v-model="password" type="password" id="password" class="form-control" />
      </div>
      <button type="submit" class="submit-button">เข้าสู่ระบบ</button>
    </form>
    <div v-if="error" class="error-message">{{ error }}</div>
    <p class="register-link"><router-link to="/register">ลงทะเบียน</router-link></p>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "LoginPage",
  data() {
    return {
      username: '',
      password: '',
      error: ''
    };
  },
  methods: {
    async login() {
      try {
        const response = await axios.get('/users.json');
        const users = response.data;

        const user = users.find(u => u.username === this.username && u.password === this.password);

        if (user) {
          localStorage.setItem('token', user.token);
          this.$router.push('/win');
        } else {
          this.error = 'ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง';
        }
      } catch (err) {
        console.log(err);
        this.error = 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้';
      }
    }
  }
};
</script>

<style scoped>
.login-container {
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

.login-form {
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

.register-link {
  margin-top: 1em;
  text-align: center;
}

.register-link a {
  color: #007bff;
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}
</style>
