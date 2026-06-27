<template>
  <!-- ボトムシート backdrop -->
  <Transition name="mob-fade">
    <div v-if="modelValue" class="sheet-backdrop sp-only" @click="emit('update:modelValue', false)"></div>
  </Transition>

  <!-- ボトムシート -->
  <Transition name="mob-slide">
    <div v-if="modelValue" class="bottom-sheet sp-only"
      :style="sheetDragY > 0 ? { transform: `translateY(${sheetDragY}px)`, transition: 'none' } : {}"
      @touchstart.passive="onSheetTouchStart"
      @touchmove.passive="onSheetTouchMove"
      @touchend="onSheetTouchEnd">
      <div class="sheet-handle-bar"></div>
      <div class="sheet-body">
        <div class="sheet-row">
          <span class="sheet-label">速度 {{ store.speed }}x</span>
          <input type="range" min="1" max="30" step="1" :value="store.speed"
            @input="store.speed = Number(($event.target as HTMLInputElement).value)" class="sheet-slider" />
        </div>
        <div class="sheet-row">
          <span class="sheet-label">マップ</span>
          <div class="sheet-chips">
            <button v-for="s in TILE_STYLES" :key="s.id"
              class="sheet-chip" :class="{ active: currentTileStyle === s.id }"
              @click="emit('switchTileStyle', s.id)">{{ s.label }}</button>
          </div>
        </div>
        <div class="sheet-row">
          <span class="sheet-label">透過</span>
          <input type="range" min="0.1" max="1" step="0.05" :value="mapOpacity"
            @input="emit('updateMapOpacity', Number(($event.target as HTMLInputElement).value))" class="sheet-slider" />
        </div>
        <div class="sheet-row">
          <span class="sheet-label">アイコン {{ iconSize }}px</span>
          <input type="range" min="16" max="80" step="2" :value="iconSize"
            @input="emit('update:iconSize', Number(($event.target as HTMLInputElement).value))" class="sheet-slider" />
        </div>
        <div class="sheet-row">
          <span class="sheet-label">ラベル {{ labelSize }}px</span>
          <input type="range" min="8" max="24" step="1" :value="labelSize"
            @input="emit('update:labelSize', Number(($event.target as HTMLInputElement).value))" class="sheet-slider" />
        </div>
        <div class="sheet-row">
          <span class="sheet-label">雨雲レーダー</span>
          <button class="sheet-chip" :class="{ active: showRain }" @click="emit('toggleRain')">🌧 {{ showRain ? 'ON' : 'OFF' }}</button>
        </div>
        <div class="sheet-row">
          <span class="sheet-label">アイコン画像</span>
          <div class="sheet-icon-row">
            <div class="icon-preview">
              <img v-if="store.icon.startsWith('blob:')" :src="store.icon" class="icon-preview-img" />
              <span v-else class="icon-preview-emoji">{{ store.icon }}</span>
            </div>
            <button class="sheet-chip" @click="emit('selectFile')">画像を選択</button>
            <button v-if="store.icon.startsWith('blob:')" class="sheet-chip sheet-chip--reset"
              @click="store.icon = store.routeMode === 'foot' ? '🚶' : '🚗'">✕</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMapStore } from '../stores/mapStore'

const TILE_STYLES = [
  { id: 'osm',      label: '標準' },
  { id: 'light',    label: 'ライト' },
  { id: 'dark',     label: 'ダーク' },
  { id: 'voyager',  label: 'クリーン' },
  { id: 'satellite', label: '衛星' },
] as const

const props = defineProps<{
  modelValue: boolean
  currentTileStyle: string
  mapOpacity: number
  iconSize: number
  labelSize: number
  showRain: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'switchTileStyle', id: string): void
  (e: 'updateMapOpacity', val: number): void
  (e: 'selectFile'): void
  (e: 'update:iconSize', val: number): void
  (e: 'update:labelSize', val: number): void
  (e: 'toggleRain'): void
}>()

// suppress unused props lint — values are used in template
void props

const store = useMapStore()

const sheetDragY = ref(0)
let sheetStartY = 0

function onSheetTouchStart(e: TouchEvent) {
  sheetStartY = e.touches[0].clientY
}

function onSheetTouchMove(e: TouchEvent) {
  const delta = e.touches[0].clientY - sheetStartY
  if (delta > 0) sheetDragY.value = delta
}

function onSheetTouchEnd() {
  if (sheetDragY.value > 100) emit('update:modelValue', false)
  sheetDragY.value = 0
}
</script>

<style scoped>
/* PC/SP 出し分け */
.sp-only { display: none; }

@media (max-width: 640px) {
  .pc-only { display: none !important; }
  .sp-only { display: flex; }
}

/* ボトムシート backdrop */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(2px);
}

/* ボトムシート */
.bottom-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 25;
  background: rgba(18, 18, 18, 0.96);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(20px);
  flex-direction: column;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  display: flex;
}

.sheet-handle-bar {
  width: 36px;
  height: 4px;
  background: rgba(255,255,255,0.25);
  border-radius: 2px;
  margin: 12px auto 6px;
  flex-shrink: 0;
}

.sheet-body {
  overflow-y: auto;
  padding: 8px 0;
  flex: 1;
  scrollbar-width: none;
}
.sheet-body::-webkit-scrollbar { display: none; }

.sheet-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sheet-row:last-child { border-bottom: none; }

.sheet-label {
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  white-space: nowrap;
  min-width: 90px;
  flex-shrink: 0;
}

.sheet-slider {
  flex: 1;
  accent-color: white;
  cursor: pointer;
}

.sheet-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.sheet-chip {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.65);
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.sheet-chip.active,
.sheet-chip:active {
  background: rgba(255,255,255,0.2);
  border-color: rgba(255,255,255,0.4);
  color: white;
}
.sheet-chip--reset {
  color: rgba(255,100,100,0.8);
  border-color: rgba(255,100,100,0.3);
}

.sheet-icon-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
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

/* Transition */
.mob-fade-enter-active, .mob-fade-leave-active { transition: opacity 0.2s; }
.mob-fade-enter-from, .mob-fade-leave-to { opacity: 0; }

.mob-slide-enter-active, .mob-slide-leave-active { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
.mob-slide-enter-from, .mob-slide-leave-to { transform: translateY(100%); }
</style>
