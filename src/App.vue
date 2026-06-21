<script setup lang="ts">
import MapView from './components/MapView.vue'
</script>

<template>
  <div id="app">
    <MapView />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
}
</style>
