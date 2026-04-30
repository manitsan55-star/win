<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import { restoreSession } from '@/utils/auth';

export default {
  name: 'App',
  async created() {
    try {
      await restoreSession();
    } catch (error) {
      console.error(error);
    }
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
