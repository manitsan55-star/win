<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import { getAuthToken, restoreSession } from '@/utils/auth';

const SESSION_CHECK_INTERVAL_MS = 10000;

export default {
  name: 'App',
  data() {
    return {
      sessionCheckIntervalId: null,
    };
  },
  async created() {
    await this.checkSession();
  },
  mounted() {
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.sessionCheckIntervalId = window.setInterval(this.checkSession, SESSION_CHECK_INTERVAL_MS);
  },
  beforeUnmount() {
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if (this.sessionCheckIntervalId) {
      window.clearInterval(this.sessionCheckIntervalId);
      this.sessionCheckIntervalId = null;
    }
  },
  methods: {
    async checkSession() {
      if (!getAuthToken()) {
        return;
      }

      try {
        await restoreSession();
      } catch (error) {
        console.error(error);
      }
    },
    async handleWindowFocus() {
      await this.checkSession();
    },
    async handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        await this.checkSession();
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
