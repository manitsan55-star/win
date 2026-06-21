<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import { getAuthToken, restoreSession } from '@/utils/auth';

export default {
  name: 'App',
  data() {
    return {
      isCheckingSession: false,
    };
  },
  async created() {
    await this.checkSession();
  },
  mounted() {
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  },
  beforeUnmount() {
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  },
  methods: {
    async checkSession() {
      if (this.isCheckingSession || !getAuthToken()) {
        return;
      }

      this.isCheckingSession = true;
      try {
        await restoreSession();
      } catch (error) {
        console.error(error);
      } finally {
        this.isCheckingSession = false;
      }
    },
    handleWindowFocus() {
      this.checkSession();
    },
    handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        this.checkSession();
      }
    },
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
body {
  margin: 0;
}
</style>
