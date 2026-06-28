<template>
  <div ref="mapContainer" class="simple-map">

    <!-- アニメーションアイコン（地図上の実座標に追従） -->
    <Transition name="sf-fade">
      <div v-if="iconReady && iconScreenPos && routeCoords.length > 0"
        class="anim-icon"
        :style="{ left: `${iconScreenPos.x}px`, top: `${iconScreenPos.y}px` }">
        <img v-if="store.icon.startsWith('blob:')" :src="store.icon"
          :style="`width:${iconSize}px;height:${iconSize}px`" class="anim-icon-img" />
        <span v-else :style="`font-size:${iconSize}px;line-height:1`">{{ store.icon }}</span>
      </div>
    </Transition>

    <!-- ヒント -->
    <Transition name="sf-fade">
      <div v-if="iconReady && store.waypoints.length === 0" class="hint-overlay">
        <div class="hint-card">
          <MapPin :size="28" class="hint-icon" />
          <p class="hint-text">地図をタップして<br>ルートを追加</p>
        </div>
      </div>
    </Transition>

    <!-- 上部バー -->
    <div v-if="iconReady" class="top-bar">
      <button class="top-pill" @click="emit('switchMode')">
        <Sliders :size="13" />
        クリエイター
      </button>
      <Transition name="sf-fade">
        <button v-if="store.waypoints.length > 0" class="top-reset" @click="handleReset">
          <RotateCcw :size="15" />
        </button>
      </Transition>
    </div>

    <!-- 現在地ボタン -->
    <button v-if="iconReady" class="locate-btn" @click="goToCurrentLocation">
      <LocateFixed :size="18" />
    </button>

    <!-- スクラバー + 保存ボタン -->
    <Transition name="sf-slide">
      <div v-if="iconReady && store.canPlay && !isCapturing" class="bottom-panel">
        <div class="scrubber-row">
          <span class="scrubber-label">出発</span>
          <input
            type="range" min="0" max="100" step="1"
            :value="Math.round(routeProgress * 100)"
            @input="onScrub($event)"
            class="scrubber"
          />
          <span class="scrubber-label">到着</span>
        </div>
        <button class="save-btn" @click="handleSave">
          <Camera :size="17" />
          この位置で保存
        </button>
      </div>
    </Transition>

    <!-- キャプチャオーバーレイ -->
    <CaptureOverlay
      :isCapturing="isCapturing"
      :showImageModal="showImageModal"
      :capturedImageUrl="capturedImageUrl"
      theme="light"
      @update:showImageModal="showImageModal = $event"
    />

    <!-- マーカー編集シート バックドロップ -->
    <Transition name="sf-fade">
      <div v-if="editingWpId" class="sheet-backdrop" @click="saveLabel" />
    </Transition>

    <!-- マーカー編集シート -->
    <Transition name="sf-sheet">
      <div v-if="editingWpId" class="marker-sheet">
        <div class="sheet-handle" />
        <p class="sheet-title">ポイントを編集</p>
        <input
          ref="sheetInputRef"
          v-model="editingLabel"
          class="sheet-input"
          type="text"
          placeholder="場所名（任意）"
          @keydown.enter="saveLabel"
          @keydown.esc="saveLabel"
        />
        <div class="sheet-actions">
          <button class="sheet-save-btn" @click="saveLabel">保存</button>
          <button class="sheet-delete-btn" @click="deleteWaypoint">
            <Trash2 :size="15" />
            削除
          </button>
        </div>
      </div>
    </Transition>

    <!-- ===== アイコン選択スクリーン ===== -->
    <Transition name="sf-screen">
      <div v-if="!iconReady" class="icon-screen">
        <div class="icon-screen-card">
          <div class="icon-screen-steps">
            <div class="icon-screen-step">
              <span class="step-emoji">🗺️</span>
              <span class="step-label">地図をタップしてルートを作成</span>
            </div>
            <div class="step-arrow">→</div>
            <div class="icon-screen-step">
              <span class="step-emoji">📸</span>
              <span class="step-label">映える写真を生成</span>
            </div>
            <div class="step-arrow">→</div>
            <div class="icon-screen-step">
              <span class="step-emoji">✨</span>
              <span class="step-label">ストーリーズでシェア</span>
            </div>
          </div>
          <p class="icon-screen-title">一緒に移動するアイコンを選ぼう</p>
          <p class="icon-screen-sub">後から変えることもできます</p>

          <div class="icon-grid">
            <button
              v-for="emoji in PRESET_ICONS"
              :key="emoji"
              class="icon-grid-item"
              :class="{ selected: store.icon === emoji }"
              @click="store.icon = emoji"
            >{{ emoji }}</button>
          </div>

          <button class="icon-photo-btn" @click="fileInputRef?.click()">
            <ImagePlus :size="16" />
            自分の写真を使う
          </button>

          <div v-if="store.icon.startsWith('blob:')" class="icon-selected-preview">
            <img :src="store.icon" class="icon-selected-img" />
            <span class="icon-selected-label">選択済み</span>
          </div>

          <button class="icon-start-btn" @click="iconReady = true">
            このアイコンでスタート
            <ArrowRight :size="16" />
          </button>
        </div>
      </div>
    </Transition>

    <input ref="fileInputRef" type="file" accept="image/*" class="d-none" @change="onFileSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import { MapPin, RotateCcw, Camera, Sliders, ImagePlus, ArrowRight, LocateFixed, Trash2 } from '@lucide/vue'
import { useMapStore } from '../stores/mapStore'
import { useCapture } from '../composables/useCapture'
import CaptureOverlay from '../components/CaptureOverlay.vue'

const PRESET_ICONS = ['🚗', '🚕', '🚙', '✈️', '🚢', '🚂', '🚲', '🛵', '🏃', '🐕']

const emit = defineEmits<{ (e: 'switchMode'): void }>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null
let mapLoaded = false

const store = useMapStore()
const { waypoints, routes } = storeToRefs(store)

const iconSize = ref(72)
const labelSize = ref(14)
const fileInputRef = ref<HTMLInputElement | null>(null)
const sheetInputRef = ref<HTMLInputElement | null>(null)
const iconReady = ref(false)
const routeProgress = ref(0.5)
const editingWpId = ref<string | null>(null)
const editingLabel = ref('')

// ── ルート座標 ────────────────────────────────────────────
const routeCoords = computed<[number, number][]>(() => store.routes.flat())

// ── アイコン位置 ──────────────────────────────────────────
const currentAnimPos = ref<[number, number] | null>(null)
const iconScreenPos = ref<{ x: number; y: number } | null>(null)

function interpolate(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function updateIconScreenPos() {
  if (!map || !currentAnimPos.value) { iconScreenPos.value = null; return }
  const pt = map.project(currentAnimPos.value)
  iconScreenPos.value = { x: pt.x, y: pt.y }
}

function updateIconFromProgress(progress: number) {
  const coords = routeCoords.value
  if (coords.length < 2) { currentAnimPos.value = null; iconScreenPos.value = null; return }

  const exactIdx = progress * (coords.length - 1)
  const i0 = Math.floor(exactIdx)
  const i1 = Math.min(i0 + 1, coords.length - 1)
  const pos = interpolate(coords[i0], coords[i1], exactIdx - i0)
  currentAnimPos.value = pos

  if (map && mapLoaded) {
    map.jumpTo({ center: pos })
    updateIconScreenPos()
  }
}

function onScrub(e: Event) {
  const val = Number((e.target as HTMLInputElement).value) / 100
  routeProgress.value = val
  updateIconFromProgress(val)
}

async function handleSave() {
  await captureImage()
}

function goToCurrentLocation() {
  navigator.geolocation?.getCurrentPosition(
    pos => map?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14 }),
    () => {},
    { timeout: 6000 },
  )
}

function handleReset() {
  store.reset()
  currentAnimPos.value = null
  iconScreenPos.value = null
  routeProgress.value = 0.5
}

// ── キャプチャ ────────────────────────────────────────────
const { isCapturing, showImageModal, capturedImageUrl, captureImage } = useCapture(
  () => map,
  () => mapLoaded,
  iconSize,
  labelSize,
  currentAnimPos,
  undefined,
  '#667eea,#764ba2',
)

// ── マーカー ──────────────────────────────────────────────
const markers: maplibregl.Marker[] = []

function openMarkerSheet(id: string) {
  const wp = store.waypoints.find(w => w.id === id)
  if (!wp) return
  editingWpId.value = id
  editingLabel.value = wp.label || ''
  setTimeout(() => sheetInputRef.value?.focus(), 80)
}

function saveLabel() {
  if (editingWpId.value) {
    store.setLabel(editingWpId.value, editingLabel.value)
  }
  editingWpId.value = null
  editingLabel.value = ''
}

function deleteWaypoint() {
  if (editingWpId.value) {
    store.removeWaypoint(editingWpId.value)
  }
  editingWpId.value = null
  editingLabel.value = ''
}

function redrawMarkers() {
  markers.forEach(m => m.remove())
  markers.length = 0
  store.waypoints.forEach(wp => {
    // ラベルは絶対配置にしてアンカーに影響させない
    const el = document.createElement('div')
    el.className = `sm-marker ${wp.type === 'main' ? 'sm-marker--main' : 'sm-marker--sub'}`
    el.textContent = String(wp.order)

    if (wp.label) {
      const labelEl = document.createElement('div')
      labelEl.className = 'sm-marker-label'
      labelEl.textContent = wp.label
      el.appendChild(labelEl)
    }

    el.addEventListener('click', (e) => { e.stopPropagation(); openMarkerSheet(wp.id) })

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([wp.lng, wp.lat])
      .addTo(map!)
    marker.on('dragend', () => {
      const ll = marker.getLngLat()
      store.updatePosition(wp.id, ll.lat, ll.lng)
    })
    markers.push(marker)
  })
}

// ── ルートソース ──────────────────────────────────────────
function buildMergedRouteFeature(coords: [number, number][][]) {
  return {
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: coords.flat() },
    properties: {},
  }
}

function updateRouteSource() {
  if (!map || !mapLoaded) return
  const source = map.getSource('routes') as GeoJSONSource | undefined
  source?.setData(buildMergedRouteFeature(store.routes))
  // ルート更新時にアイコン位置も更新
  if (routeCoords.value.length >= 2) updateIconFromProgress(routeProgress.value)
}

function renderIconToImageData(icon: string): ImageData {
  const size = 64
  const c = document.createElement('canvas')
  c.width = size; c.height = size
  const ctx = c.getContext('2d')!
  ctx.font = `${size * 0.8}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(icon, size / 2, size / 2)
  return ctx.getImageData(0, 0, size, size)
}

function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const img = new Image()
  img.onload = () => {
    const size = 128
    const c = document.createElement('canvas')
    c.width = size; c.height = size
    const ctx = c.getContext('2d')!
    const min = Math.min(img.width, img.height)
    const sx = (img.width - min) / 2
    const sy = (img.height - min) / 2
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
    if (store.icon.startsWith('blob:')) URL.revokeObjectURL(store.icon)
    c.toBlob(blob => {
      if (blob) store.icon = URL.createObjectURL(blob)
    }, 'image/png')
  }
  img.src = URL.createObjectURL(file)
  ;(e.target as HTMLInputElement).value = ''
}

// ── ライフサイクル ────────────────────────────────────────
onMounted(() => {
  if (!mapContainer.value) return

  store.routeMode = 'driving'
  store.icon = '🚗'

  map = new maplibregl.Map({
    container: mapContainer.value,
    preserveDrawingBuffer: true,
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [139.6917, 35.6895] as [number, number],
    zoom: 13,
  } as unknown as maplibregl.MapOptions)

  // 現在地に移動
  navigator.geolocation?.getCurrentPosition(
    pos => map?.jumpTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14 }),
    () => {},
    { timeout: 6000 },
  )

  map.on('click', async (e) => {
    if (!iconReady.value) return
    if (editingWpId.value) { saveLabel(); return }
    const id = await store.addWaypoint(e.lngLat.lat, e.lngLat.lng)
    await new Promise(r => setTimeout(r, 50))
    openMarkerSheet(id)
  })

  map.on('move', updateIconScreenPos)
  map.on('zoom', updateIconScreenPos)

  map.on('load', () => {
    mapLoaded = true

    const firstSymbolId = map!.getStyle().layers.find(l => l.type === 'symbol')?.id

    map!.addSource('routes', {
      type: 'geojson',
      data: buildMergedRouteFeature(store.routes),
      lineMetrics: true,
    })

    map!.addLayer({
      id: 'routes',
      type: 'line',
      source: 'routes',
      paint: {
        'line-width': 7,
        'line-opacity': 0.9,
        'line-gradient': [
          'interpolate', ['linear'], ['line-progress'],
          0, '#667eea',
          0.5, '#9f7aea',
          1, '#ed64a6',
        ],
      },
      layout: { 'line-join': 'round', 'line-cap': 'round' },
    }, firstSymbolId)

    // routes-trail はuseCapture内で参照されるため空で用意
    map!.addSource('routes-trail', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
    })
    map!.addLayer({
      id: 'routes-trail',
      type: 'line',
      source: 'routes-trail',
      paint: { 'line-width': 0 },
      layout: { visibility: 'none' },
    }, firstSymbolId)

    map!.addSource('anim-point', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
    })
    map!.addImage('anim-icon', renderIconToImageData(store.icon))
    map!.addLayer({
      id: 'anim-point-layer',
      type: 'symbol',
      source: 'anim-point',
      layout: { visibility: 'none', 'icon-image': 'anim-icon', 'icon-size': 0.75 },
    })
  })
})

watch(waypoints, redrawMarkers, { deep: true })
watch(routes, updateRouteSource, { deep: true })

onUnmounted(() => {
  map?.remove()
})
</script>

<style scoped>
.simple-map {
  flex: 1;
  height: 100%;
  position: relative;
}

/* ヒント */
.hint-overlay {
  position: absolute;
  bottom: 160px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
}

.hint-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 20px 28px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

.hint-icon { color: #667eea; }

.hint-text {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-align: center;
  line-height: 1.6;
}

/* 上部バー */
.top-bar {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 15;
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 20px;
  color: #555;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: background 0.15s;
}
.top-pill:hover { background: white; }

.top-reset {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 50%;
  color: #555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: background 0.15s;
}
.top-reset:hover { background: white; }

/* 現在地ボタン */
.locate-btn {
  position: absolute;
  right: 16px;
  bottom: 160px;
  z-index: 15;
  width: 44px;
  height: 44px;
  background: white;
  border: none;
  border-radius: 50%;
  color: #667eea;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.15s;
}
.locate-btn:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); }

/* スクラバー + 保存 */
.bottom-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 15;
  padding: 20px 24px max(24px, env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(255,255,255,0.95) 60%, transparent 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.scrubber-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scrubber-label {
  font-size: 11px;
  font-weight: 600;
  color: #aaa;
  white-space: nowrap;
  flex-shrink: 0;
}

.scrubber {
  flex: 1;
  height: 6px;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(to right, #667eea, #9f7aea, #ed64a6);
  border-radius: 3px;
  cursor: pointer;
  outline: none;
}

.scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  border: 2.5px solid #9f7aea;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  cursor: grab;
}
.scrubber::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.1); }
.scrubber::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  border: 2.5px solid #9f7aea;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  cursor: grab;
}

.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #ed64a6 100%);
  border: none;
  border-radius: 28px;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: transform 0.1s, box-shadow 0.15s;
  letter-spacing: 0.02em;
}
.save-btn:active {
  transform: scale(0.97);
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
}

/* アニメーションアイコン */
.anim-icon {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 8;
  filter: drop-shadow(0 2px 10px rgba(0,0,0,0.25));
  display: flex;
  align-items: center;
  justify-content: center;
}
.anim-icon-img { border-radius: 50%; object-fit: cover; }

/* ===== アイコン選択スクリーン ===== */
.icon-screen {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.icon-screen-card {
  background: white;
  border-radius: 28px;
  padding: 32px 28px;
  width: min(400px, 100%);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.icon-screen-steps {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f5f5f7;
  border-radius: 16px;
  padding: 14px 12px;
  width: 100%;
}

.icon-screen-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.step-emoji {
  font-size: 22px;
  line-height: 1;
}

.step-label {
  font-size: 10px;
  font-weight: 600;
  color: #555;
  text-align: center;
  line-height: 1.4;
}

.step-arrow {
  font-size: 14px;
  color: #bbb;
  flex-shrink: 0;
}

.icon-screen-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  text-align: center;
}

.icon-screen-sub {
  font-size: 12px;
  color: #aaa;
  text-align: center;
  margin-top: -12px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  width: 100%;
}

.icon-grid-item {
  aspect-ratio: 1;
  font-size: 28px;
  background: #f5f5f7;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.icon-grid-item:hover { background: #ebebed; transform: scale(1.05); }
.icon-grid-item.selected {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.08);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.icon-photo-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  background: #f5f5f7;
  border: none;
  border-radius: 20px;
  color: #444;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  width: 100%;
  justify-content: center;
}
.icon-photo-btn:hover { background: #ebebed; }

.icon-selected-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(102, 126, 234, 0.06);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 14px;
  width: 100%;
}
.icon-selected-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.icon-selected-label { font-size: 13px; color: #667eea; font-weight: 600; }

.icon-start-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 24px;
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  transition: transform 0.1s;
  letter-spacing: 0.02em;
}
.icon-start-btn:active { transform: scale(0.97); }

.d-none { display: none; }

/* Transitions */
.sf-fade-enter-active, .sf-fade-leave-active { transition: opacity 0.2s; }
.sf-fade-enter-from, .sf-fade-leave-to { opacity: 0; }

.sf-slide-enter-active, .sf-slide-leave-active { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1), opacity 0.25s; }
.sf-slide-enter-from, .sf-slide-leave-to { transform: translateY(20px); opacity: 0; }

.sf-screen-enter-active, .sf-screen-leave-active { transition: opacity 0.3s; }
.sf-screen-enter-from, .sf-screen-leave-to { opacity: 0; }

.sf-sheet-enter-active, .sf-sheet-leave-active { transition: transform 0.28s cubic-bezier(0.32,0.72,0,1); }
.sf-sheet-enter-from, .sf-sheet-leave-to { transform: translateY(100%); }
</style>

<style>
.sm-marker-label {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  color: #333;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  pointer-events: none;
}

.sm-marker {
  position: relative;
  overflow: visible;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: white;
  border: 3px solid white;
  box-shadow: 0 3px 12px rgba(0,0,0,0.25);
  cursor: grab;
  user-select: none;
}
.sm-marker:active { cursor: grabbing; }
.sm-marker--main { background: linear-gradient(135deg, #667eea, #764ba2); }
.sm-marker--sub { background: #94a3b8; }

/* マーカー編集シート */
.sheet-backdrop {
  position: absolute;
  inset: 0;
  z-index: 18;
}

.marker-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 19;
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 12px 24px max(28px, env(safe-area-inset-bottom));
  box-shadow: 0 -4px 32px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  align-self: center;
  margin-bottom: 4px;
}

.sheet-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}

.sheet-input {
  border: none;
  outline: none;
  border-bottom: 2px solid #667eea;
  font-size: 15px;
  font-weight: 500;
  padding: 6px 0;
  color: #333;
  font-family: 'Noto Sans JP', sans-serif;
  background: transparent;
  width: 100%;
}
.sheet-input::placeholder { color: #bbb; }

.sheet-actions {
  display: flex;
  gap: 10px;
}

.sheet-save-btn {
  flex: 1;
  padding: 13px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 20px;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: opacity 0.15s;
}
.sheet-save-btn:active { opacity: 0.85; }

.sheet-delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 13px 20px;
  background: #fff0f0;
  border: 1px solid #fdd;
  border-radius: 20px;
  color: #e53e3e;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.sheet-delete-btn:active { background: #ffe4e4; }
</style>
