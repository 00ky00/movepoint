<template>
  <!-- モードピル -->
  <button class="mob-mode-pill sp-only"
    @click="store.setRouteMode(store.routeMode === 'foot' ? 'driving' : 'foot')">
    <span class="mob-mode-text">{{ store.routeMode === 'foot' ? '散歩' : 'ドライブ' }}</span>
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style="opacity:0.6;flex-shrink:0">
      <path d="M3 5V8.5L1.5 7 0 8.5 3 11.5 6 8.5 4.5 7 3 8.5V5H3z"/>
      <path d="M9 7V3.5L10.5 5 12 3.5 9 0.5 6 3.5 7.5 5 9 3.5V7H9z"/>
    </svg>
  </button>

  <!-- 設定ボタン -->
  <button class="mob-settings-btn sp-only" @click="emit('openSettings')">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <rect x="2" y="4" width="16" height="2" rx="1"/>
      <rect x="2" y="9" width="16" height="2" rx="1"/>
      <rect x="2" y="14" width="16" height="2" rx="1"/>
    </svg>
  </button>

  <!-- 停止FAB（再生/一時停止中のみ） -->
  <Transition name="mob-fade">
    <button v-if="store.isPlaying || store.isPaused" class="mob-stop-fab sp-only" @click="store.stop()">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <rect x="2" y="2" width="14" height="14" rx="2"/>
      </svg>
    </button>
  </Transition>

  <!-- 下部アクションバー -->
  <div class="mob-action-bar sp-only">
    <button class="mob-side-btn mob-side-btn--text" @click="store.reset()">リセット</button>
    <button class="mob-play-btn" :disabled="!store.canPlay"
      @click="store.isPlaying ? store.pause() : store.play()">
      <svg v-if="!store.isPlaying" width="26" height="26" viewBox="0 0 26 26" fill="currentColor">
        <polygon points="6,3 23,13 6,23"/>
      </svg>
      <svg v-else width="26" height="26" viewBox="0 0 26 26" fill="currentColor">
        <rect x="4" y="3" width="7" height="20" rx="1.5"/>
        <rect x="15" y="3" width="7" height="20" rx="1.5"/>
      </svg>
    </button>
    <button class="mob-side-btn mob-side-btn--text" :disabled="!store.isPaused" @click="emit('capture')">保存</button>
  </div>
</template>

<script setup lang="ts">
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
