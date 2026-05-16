<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import { getAuthToken, restoreSession } from '@/utils/auth';

const SESSION_CHECK_INTERVAL_MS = 2000;

export default {
  name: 'App',
  data() {
    return {
      sessionCheckIntervalId: null,
    };
  },
  async created() {
    if (getAuthToken()) {
      try {
        await restoreSession();
      } catch (error) {
        console.error('Failed to restore session on app load:', error);
        // Don't automatically logout on restore failure
        // Keep the token and let the user continue with local session
      }
    }
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
      console.log('Session check running...');
      if (!getAuthToken()) {
        console.log('No auth token, skipping session check');
        return;
      }

      try {
        console.log('Calling restoreSession...');
        const user = await restoreSession();
        console.log('Restore session result:', user);
        // If restoreSession returns null, user was logged out, stop checking
        if (!user) {
          console.log('User logged out, stopping session check');
          this.stopSessionCheck();
        }
      } catch (error) {
        // For session_replaced, restoreSession already logged out
        if (error.message === 'session_replaced') {
          console.log('Session replaced, stopping session check');
          this.stopSessionCheck();
        } else {
          console.error('Session check error:', error);
        }
      }
    },
    stopSessionCheck() {
      if (this.sessionCheckIntervalId) {
        window.clearInterval(this.sessionCheckIntervalId);
        this.sessionCheckIntervalId = null;
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
