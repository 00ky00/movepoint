<script setup lang="ts">
import { ref } from 'vue'
import { useMapStore } from './stores/mapStore'
import MapView from './components/MapView.vue'
import SimpleView from './views/SimpleView.vue'

const store = useMapStore()
const mode = ref<'simple' | 'creator'>('simple')

function switchMode(to: 'simple' | 'creator') {
  store.reset()
  mode.value = to
}
</script>

<template>
  <div id="app">
    <SimpleView v-if="mode === 'simple'" @switchMode="switchMode('creator')" />
    <MapView v-else />

    <!-- クリエイターモード時のシンプルモード切替ボタン -->
    <button v-if="mode === 'creator'" class="to-simple-btn" @click="switchMode('simple')">
      ← シンプルモード
    </button>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Noto Sans JP', sans-serif;
}

html, body, #app {
  width: 100%;
  height: 100%;
}

.to-simple-btn {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: white;
  border: none;
  border-radius: 24px;
  color: #333;
  font-size: 13px;
  font-weight: 700;
  padding: 11px 22px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.22);
  white-space: nowrap;
  transition: box-shadow 0.15s, transform 0.1s;
}
.to-simple-btn:hover { box-shadow: 0 6px 24px rgba(0, 0, 0, 0.28); }
.to-simple-btn:active { transform: translateX(-50%) scale(0.97); }

@media (max-width: 640px) {
  .to-simple-btn {
    bottom: auto;
    top: 70px;
    left: 16px;
    transform: none;
    font-size: 12px;
    padding: 8px 14px;
  }
}
</style>
