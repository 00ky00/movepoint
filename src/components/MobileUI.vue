<template>
  <!-- モードピル -->
  <button class="mob-mode-pill sp-only"
    @click="store.setRouteMode(store.routeMode === 'foot' ? 'driving' : 'foot')">
    <span class="mob-mode-text">{{ store.routeMode === 'foot' ? '散歩' : 'ドライブ' }}</span>
    <ArrowUpDown :size="12" style="opacity:0.6;flex-shrink:0" />
  </button>

  <!-- 設定ボタン -->
  <button class="mob-settings-btn sp-only" @click="emit('openSettings')">
    <Menu :size="20" />
  </button>

  <!-- 停止FAB（再生/一時停止中のみ） -->
  <Transition name="mob-fade">
    <button v-if="store.isPlaying || store.isPaused" class="mob-stop-fab sp-only" @click="store.stop()">
      <Square :size="16" />
    </button>
  </Transition>

  <!-- 下部アクションバー -->
  <div class="mob-action-bar sp-only">
    <button class="mob-side-btn mob-side-btn--text" @click="store.reset()">リセット</button>
    <button class="mob-play-btn" :disabled="!store.canPlay"
      @click="store.isPlaying ? store.pause() : store.play()">
      <Pause v-if="store.isPlaying" :size="26" />
      <Play v-else :size="26" />
    </button>
    <button class="mob-side-btn" :disabled="!store.isPaused" @click="emit('capture')">
      <Camera :size="22" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ArrowUpDown, Menu, Square, Play, Pause, Camera } from '@lucide/vue'
import { useMapStore } from '../stores/mapStore'

const store = useMapStore()

const emit = defineEmits<{
  (e: 'openSettings'): void
  (e: 'capture'): void
}>()
</script>

<style scoped>
/* PC/SP 出し分け */
.sp-only { display: none; }

@media (max-width: 640px) {
  .pc-only { display: none !important; }
  .sp-only { display: flex; }
}

/* モードピル */
.mob-mode-pill {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 24px;
  cursor: pointer;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
  transition: background 0.15s;
}
.mob-mode-pill:active { background: rgba(0,0,0,0.75); }

.mob-mode-text { font-size: 13px; }

/* 設定ボタン */
.mob-settings-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 15;
  width: 42px;
  height: 42px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  font-size: 20px;
  border-radius: 50%;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.mob-settings-btn:active { background: rgba(0,0,0,0.75); }

/* 停止 FAB */
.mob-stop-fab {
  position: absolute;
  bottom: 120px;
  right: 20px;
  z-index: 15;
  width: 52px;
  height: 52px;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(255,255,255,0.25);
  backdrop-filter: blur(10px);
  color: white;
  font-size: 22px;
  border-radius: 50%;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

/* 下部アクションバー */
.mob-action-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 15;
  padding: 12px 24px max(16px, env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
  align-items: center;
  justify-content: space-between;
}

.mob-play-btn {
  width: 72px;
  height: 72px;
  background: rgba(255,255,255,0.92);
  border: none;
  color: #111;
  font-size: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  transition: transform 0.1s, background 0.15s;
  flex-shrink: 0;
}
.mob-play-btn:active { transform: scale(0.93); }
.mob-play-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.mob-side-btn {
  width: 48px;
  height: 48px;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(8px);
  color: white;
  font-size: 22px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.mob-side-btn:active { background: rgba(255,255,255,0.2); }
.mob-side-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.mob-side-btn--text { font-size: 13px; font-weight: 600; width: auto; padding: 0 14px; border-radius: 24px; }

/* Transition */
.mob-fade-enter-active, .mob-fade-leave-active { transition: opacity 0.2s; }
.mob-fade-enter-from, .mob-fade-leave-to { opacity: 0; }
</style>
