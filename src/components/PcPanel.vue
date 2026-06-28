<template>
  <div class="pc-panel pc-only" :class="{ 'pc-panel--closed': !panelOpen }">
    <button class="panel-toggle-btn" @click="panelOpen = !panelOpen">{{ panelOpen ? '›' : '‹' }}</button>

    <div class="pc-panel-content" v-show="panelOpen">

      <!-- モード -->
      <div class="panel-section">
        <div class="section-label">ルートモード</div>
        <div class="mode-toggle">
          <span class="mode-icon" :class="{ active: store.routeMode === 'foot' }"><Footprints :size="20" /></span>
          <div class="toggle-track" @click="store.setRouteMode(store.routeMode === 'foot' ? 'driving' : 'foot')">
            <div class="toggle-thumb" :class="{ right: store.routeMode === 'driving' }"></div>
          </div>
          <span class="mode-icon" :class="{ active: store.routeMode === 'driving' }"><Car :size="20" /></span>
        </div>
      </div>

      <!-- 速度 -->
      <div class="panel-section">
        <div class="section-label">速度 {{ store.speed }}x</div>
        <input type="range" min="1" max="30" step="1" :value="store.speed"
          @input="store.speed = Number(($event.target as HTMLInputElement).value)"
          class="panel-slider" />
      </div>

      <!-- マップスタイル -->
      <div class="panel-section">
        <div class="section-label">マップ</div>
        <div class="tile-grid">
          <button v-for="s in TILE_STYLES" :key="s.id"
            class="tile-btn" :class="{ active: currentTileStyle === s.id }"
            @click="emit('switchTileStyle', s.id)">{{ s.label }}</button>
        </div>
      </div>

      <!-- 透過 -->
      <div class="panel-section">
        <div class="section-label">透過</div>
        <input type="range" min="0.1" max="1" step="0.05" :value="mapOpacity"
          @input="emit('updateMapOpacity', Number(($event.target as HTMLInputElement).value))"
          class="panel-slider" />
      </div>

      <!-- 再生コントロール -->
      <div class="panel-section panel-controls">
        <button
          class="ctrl-btn ctrl-btn--play"
          :disabled="!store.canPlay"
          @click="store.isPlaying ? store.pause() : store.play()"
        >
          <Pause v-if="store.isPlaying" :size="22" />
          <Play v-else :size="22" />
        </button>
        <button class="ctrl-btn" :disabled="!store.isPlaying && !store.isPaused" @click="store.stop()">
          <Square :size="22" />
        </button>
        <button class="ctrl-btn" :disabled="!store.isPaused" @click="emit('capture')">
          <Camera :size="22" />
        </button>
        <button class="ctrl-btn ctrl-btn--text" @click="store.reset()">リセット</button>
      </div>

      <!-- アイコン / ラベル -->
      <div class="panel-section">
        <div class="section-label">アイコン {{ iconSize }}px</div>
        <input type="range" min="16" max="80" step="2" :value="iconSize"
          @input="emit('update:iconSize', Number(($event.target as HTMLInputElement).value))"
          class="panel-slider" style="margin-bottom:14px" />
        <div class="section-label">ラベル {{ labelSize }}px</div>
        <input type="range" min="8" max="24" step="1" :value="labelSize"
          @input="emit('update:labelSize', Number(($event.target as HTMLInputElement).value))"
          class="panel-slider" style="margin-bottom:10px" />
        <div class="icon-row">
          <div class="icon-preview">
            <img v-if="store.icon.startsWith('blob:')" :src="store.icon" class="icon-preview-img" />
            <span v-else class="icon-preview-emoji">{{ store.icon }}</span>
          </div>
          <button class="icon-upload-btn" @click="emit('selectFile')">画像を選択</button>
          <button v-if="store.icon.startsWith('blob:')" class="icon-reset-btn"
            @click="store.icon = store.routeMode === 'foot' ? '🚶' : '🚗'"><X :size="12" /></button>
        </div>
      </div>

      <!-- ウェイポイント一覧 -->
      <div class="panel-section" v-if="store.waypoints.length > 0">
        <div class="section-label">ポイント</div>
        <div class="wp-list">
          <button v-for="wp in store.waypoints" :key="wp.id"
            class="wp-list-item" @click="emit('openPointSheet', wp.id)">
            <div class="wp-list-dot" :class="wp.type === 'main' ? 'wp-dot--main' : 'wp-dot--sub'">
              {{ wp.order }}
            </div>
            <span class="wp-list-label">{{ wp.label || '（ラベルなし）' }}</span>
            <Pencil :size="14" class="wp-list-edit-icon" />
          </button>
        </div>
      </div>

    </div> <!-- /pc-panel-content -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Footprints, Car, Play, Pause, Square, Camera, X, Pencil } from '@lucide/vue'
import { useMapStore } from '../stores/mapStore'

const TILE_STYLES = [
  { id: 'osm',      label: '標準' },
  { id: 'light',    label: 'ライト' },
  { id: 'dark',     label: 'ダーク' },
  { id: 'voyager',  label: 'クリーン' },
  { id: 'satellite', label: '衛星' },
] as const

const props = defineProps<{
  currentTileStyle: string
  mapOpacity: number
  iconSize: number
  labelSize: number
  showRain: boolean
}>()

const emit = defineEmits<{
  (e: 'switchTileStyle', id: string): void
  (e: 'updateMapOpacity', val: number): void
  (e: 'capture'): void
  (e: 'selectFile'): void
  (e: 'openPointSheet', id: string): void
  (e: 'update:iconSize', val: number): void
  (e: 'update:labelSize', val: number): void
  (e: 'toggleRain'): void
}>()

// suppress unused props lint — values are used in template
void props

const store = useMapStore()
const panelOpen = ref(true)
</script>

<style scoped>
/* PC 右サイドパネル */
.pc-panel {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 20vw;
  min-width: 400px;
  max-width: 500px;
  background: rgba(15, 15, 15, 0.82);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
  display: flex;
  flex-direction: row;
  z-index: 10;
  transition: width 0.22s ease, min-width 0.22s ease;
}

.pc-panel--closed {
  width: 32px !important;
  min-width: 32px !important;
}

.pc-panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  scrollbar-width: none;
  min-width: 0;
}

.pc-panel-content::-webkit-scrollbar { display: none; }

.panel-toggle-btn {
  width: 32px;
  flex-shrink: 0;
  background: none;
  border: none;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
  writing-mode: vertical-rl;
  letter-spacing: 0;
}

.panel-toggle-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.06);
}

.panel-section {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.section-label {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

/* モードトグル */
.mode-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mode-icon {
  font-size: 20px;
  opacity: 0.35;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.mode-icon.active { opacity: 1; }

.toggle-track {
  flex: 1;
  height: 28px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  position: relative;
  cursor: pointer;
  transition: background 0.15s;
}

.toggle-track:hover { background: rgba(255, 255, 255, 0.2); }

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(50% - 3px);
  height: 22px;
  background: white;
  border-radius: 11px;
  transition: left 0.2s ease;
}

.toggle-thumb.right { left: calc(50%); }

/* スライダー */
.panel-slider {
  width: 100%;
  accent-color: white;
  cursor: pointer;
  display: block;
}

/* マップスタイル */
.tile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.tile-btn {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  padding: 6px 4px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.tile-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: white;
}

.tile-btn.active {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.45);
  color: white;
}

/* コントロールボタン */
.ctrl-btn {
  flex: 1;
  min-width: 42px;
  height: 52px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  font-size: 22px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.ctrl-btn:hover { background: rgba(255, 255, 255, 0.16); }
.ctrl-btn:active { background: rgba(255, 255, 255, 0.24); }

.ctrl-btn--play {
  background: #0d6efd;
  border-color: transparent;
}

.ctrl-btn--play:hover { background: #0b5ed7; }

.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

.ctrl-btn--text {
  font-size: 13px;
  font-weight: 600;
}

/* アイコン */
.icon-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-preview {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-preview-emoji { font-size: 26px; }

.icon-preview-img {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 6px;
}

.icon-upload-btn {
  flex: 1;
  height: 36px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.icon-upload-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.icon-reset-btn {
  width: 32px;
  height: 36px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}

.icon-reset-btn:hover {
  background: rgba(255, 100, 100, 0.2);
  color: white;
}

/* ウェイポイント一覧 */
.wp-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 230px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.15) transparent;
}

.wp-list::-webkit-scrollbar { width: 4px; }
.wp-list::-webkit-scrollbar-track { background: transparent; }
.wp-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

.wp-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  cursor: pointer;
  color: white;
  transition: background 0.15s;
  width: 100%;
  text-align: left;
}

.wp-list-item:hover { background: rgba(255,255,255,0.1); }

.wp-list-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  color: white;
  border: 2px solid rgba(255,255,255,0.4);
  flex-shrink: 0;
}

.wp-dot--main { background: #0d6efd; }
.wp-dot--sub { background: #ffc107; color: #212529; }

.wp-list-label {
  flex: 1;
  font-size: 13px;
  color: rgba(255,255,255,0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wp-list-edit-icon {
  color: rgba(255,255,255,0.25);
  flex-shrink: 0;
  transition: color 0.15s;
}

.wp-list-item:hover .wp-list-edit-icon { color: rgba(255,255,255,0.6); }

/* PC/SP 出し分け */
.sp-only { display: none; }

@media (max-width: 640px) {
  .pc-only { display: none !important; }
  .sp-only { display: flex; }
}
</style>
