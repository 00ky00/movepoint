<template>
  <div ref="mapContainer" id="map">

    <!-- PC 右サイドパネル -->
    <PcPanel
      :currentTileStyle="currentTileStyle"
      :mapOpacity="mapOpacity"
      :iconSize="iconSize"
      :labelSize="labelSize"
      :showRain="showRain"
      @switchTileStyle="switchTileStyle"
      @updateMapOpacity="updateMapOpacity"
      @capture="captureImage"
      @selectFile="fileInputRef?.click()"
      @openPointSheet="openPointSheet"
      @update:iconSize="iconSize = $event"
      @update:labelSize="labelSize = $event"
      @toggleRain="toggleRain"
    />

    <!-- モバイル UI -->
    <MobileUI
      @openSettings="showBottomSheet = true"
      @capture="captureImage"
    />

    <!-- アニメーションアイコン（マップ中央固定） -->
    <Transition name="mob-fade">
      <div v-if="store.isPlaying || store.isPaused" class="anim-icon-center">
        <img v-if="store.icon.startsWith('blob:')" :src="store.icon"
          :style="`width:${iconSize}px;height:${iconSize}px`" class="anim-icon-img" />
        <span v-else :style="`font-size:${iconSize}px;line-height:1`">{{ store.icon }}</span>
      </div>
    </Transition>

    <!-- ポイント追加/編集シート -->
    <PointSheet
      :modelValue="pointSheet"
      @update:modelValue="pointSheet = $event"
      @confirm="confirmPointSheet"
      @delete="deleteFromPointSheet"
    />

    <!-- 設定ボトムシート -->
    <BottomSheet
      v-model="showBottomSheet"
      :currentTileStyle="currentTileStyle"
      :mapOpacity="mapOpacity"
      :iconSize="iconSize"
      :labelSize="labelSize"
      :showRain="showRain"
      @switchTileStyle="switchTileStyle"
      @updateMapOpacity="updateMapOpacity"
      @selectFile="fileInputRef?.click()"
      @update:iconSize="iconSize = $event"
      @update:labelSize="labelSize = $event"
      @toggleRain="toggleRain"
    />

    <!-- クレジット (PC only) -->
    <div class="credit-label">by kouta</div>

    <!-- ヘルプボタン -->
    <button class="help-btn" @click="showHelpModal = true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="8" r="7.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <text x="8" y="12.5" text-anchor="middle" font-size="10" font-weight="bold" font-family="serif">i</text>
      </svg>
    </button>

    <!-- ヘルプモーダル -->
    <HelpModal v-model="showHelpModal" />

    <!-- キャプチャオーバーレイ + 画像プレビュー -->
    <CaptureOverlay
      :isCapturing="isCapturing"
      :showImageModal="showImageModal"
      :capturedImageUrl="capturedImageUrl"
      @update:showImageModal="showImageModal = $event"
    />

    <input ref="fileInputRef" type="file" accept="image/*" class="d-none" @change="onFileSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapStore } from '../stores/mapStore'
import { useAnimation } from '../composables/useAnimation'
import { useCapture } from '../composables/useCapture'
import PcPanel from './PcPanel.vue'
import MobileUI from './MobileUI.vue'
import BottomSheet from './BottomSheet.vue'
import PointSheet from './PointSheet.vue'
import type { PointSheetData } from './PointSheet.vue'
import HelpModal from './HelpModal.vue'
import CaptureOverlay from './CaptureOverlay.vue'

// ── マップ本体 ──────────────────────────────────────────
const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null
let mapLoaded = false

const store = useMapStore()
const { waypoints, routes, isPlaying, isPaused } = storeToRefs(store)

const isTouchDevice = navigator.maxTouchPoints > 0

// ── マーカー管理 ────────────────────────────────────────
const markers: maplibregl.Marker[] = []
const markerMeta: { marker: maplibregl.Marker; type: 'main' | 'sub' }[] = []
const touchDragCleanups: (() => void)[] = []

// ── 状態 ────────────────────────────────────────────────
const mapOpacity = ref(1)
const iconSize = ref(40)
const labelSize = ref(11)
const showHelpModal = ref(true)

// 雨雲レーダー
const showRain = ref(false)
let rainTilePath: string | null = null

async function fetchRainTimestamp() {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
    const data = await res.json()
    const frames = data.radar?.past
    if (frames?.length) {
      const last = frames[frames.length - 1]
      rainTilePath = `${data.host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`
    }
  } catch { /* 取得失敗時は無効のまま */ }
}

function toggleRain() {
  if (!map || !mapLoaded) return
  showRain.value = !showRain.value
  if (showRain.value && rainTilePath) {
    if (!map.getSource('rain')) {
      map.addSource('rain', {
        type: 'raster',
        tiles: [rainTilePath],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 12,
        attribution: 'RainViewer',
      })
      map.addLayer({ id: 'rain', type: 'raster', source: 'rain', paint: { 'raster-opacity': 0.6 } })
    }
  } else {
    if (map.getLayer('rain')) map.removeLayer('rain')
    if (map.getSource('rain')) map.removeSource('rain')
  }
}
const showBottomSheet = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const TILE_STYLES = [
  { id: 'osm',       label: '標準',   tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'] },
  { id: 'light',     label: 'ライト', tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'] },
  { id: 'dark',      label: 'ダーク', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'] },
  { id: 'voyager',   label: 'クリーン', tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'] },
  { id: 'satellite', label: '衛星',   tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'] },
] as const
const currentTileStyle = ref('voyager')

// ── composables ─────────────────────────────────────────
const { currentAnimPos, startAnimation, pauseAnimation, stopAnimation } = useAnimation(
  () => map,
  () => mapLoaded,
)

const { isCapturing, showImageModal, capturedImageUrl, captureImage } = useCapture(
  () => map,
  () => mapLoaded,
  iconSize,
  labelSize,
  currentAnimPos,
)

// ── ポイントシート ───────────────────────────────────────
const pointSheet = ref<PointSheetData | null>(null)

function openPointSheet(id: string) {
  const wp = store.waypoints.find(w => w.id === id)
  if (!wp) return
  pointSheet.value = { id, label: wp.label || '', isMain: wp.type === 'main', order: wp.order }
}

function deleteFromPointSheet() {
  if (!pointSheet.value) return
  const id = pointSheet.value.id
  pointSheet.value = null
  store.removeWaypoint(id)
}

function confirmPointSheet() {
  if (!pointSheet.value) return
  const { id, label, isMain } = pointSheet.value
  store.setLabel(id, label)
  const wp = store.waypoints.find(w => w.id === id)
  if (wp && wp.order > 1 && (wp.type === 'main') !== isMain) {
    store.toggleType(id)
  }
  pointSheet.value = null
  nextTick(redrawMarkers)
}

// ── マップ操作 ───────────────────────────────────────────
function updateMapOpacity(val: number) {
  mapOpacity.value = val
  if (map && mapLoaded) map.setPaintProperty('osm', 'raster-opacity', val)
}

function switchTileStyle(styleId: string) {
  if (!map || !mapLoaded) return
  const style = TILE_STYLES.find(s => s.id === styleId)
  if (!style) return
  currentTileStyle.value = styleId
  map.removeLayer('osm')
  map.removeSource('osm')
  map.addSource('osm', { type: 'raster', tiles: [...style.tiles], tileSize: 256 })
  map.addLayer({ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': mapOpacity.value } }, 'routes-trail')
}

// ── アイコン ─────────────────────────────────────────────
const ICON_SIZE = 64

function renderIconToImageData(icon: string): ImageData {
  const c = document.createElement('canvas')
  c.width = ICON_SIZE
  c.height = ICON_SIZE
  const ctx = c.getContext('2d')!
  ctx.font = `${ICON_SIZE * 0.8}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(icon, ICON_SIZE / 2, ICON_SIZE / 2)
  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE)
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

// ── ルート描画 ────────────────────────────────────────────
function buildRouteGeoJSON(routeCoords: [number, number][][]) {
  return {
    type: 'FeatureCollection' as const,
    features: routeCoords.map(coords => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: coords },
      properties: {},
    })),
  }
}

function updateRouteSource() {
  if (!map || !mapLoaded) return
  const source = map.getSource('routes') as GeoJSONSource | undefined
  if (source) source.setData(buildRouteGeoJSON(store.routes))
}

// ── マーカー ──────────────────────────────────────────────
function createMarkerEl(order: number, type: 'main' | 'sub', label?: string) {
  const wrapper = document.createElement('div')
  wrapper.className = 'marker-wrapper'

  const circle = document.createElement('div')
  circle.className = `map-marker map-marker--${type}`
  circle.textContent = String(order)
  wrapper.appendChild(circle)

  if (label) {
    const labelEl = document.createElement('div')
    labelEl.className = 'marker-label'
    labelEl.style.fontSize = `${labelSize.value}px`
    labelEl.textContent = label
    wrapper.appendChild(labelEl)
  }

  return { wrapper, circle }
}

function showLabelInput(id: string) {
  const wp = store.waypoints.find(w => w.id === id)
  if (!wp) return

  const container = document.createElement('div')
  const input = document.createElement('input')
  input.type = 'text'
  input.value = wp.label || ''
  input.placeholder = 'ラベルを入力'
  input.className = 'label-input'
  container.appendChild(input)

  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 16 })
    .setLngLat([wp.lng, wp.lat])
    .setDOMContent(container)
    .addTo(map!)

  setTimeout(() => input.focus(), 0)

  const save = () => {
    store.setLabel(id, input.value)
    popup.remove()
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') popup.remove()
  })
  input.addEventListener('blur', save)
}

function updateSubMarkerVisibility() {
  markerMeta.forEach(({ marker, type }) => {
    const shouldHide = (store.isPlaying || store.isPaused) && type === 'sub'
    marker.getElement().style.visibility = shouldHide ? 'hidden' : 'visible'
  })
}

function redrawMarkers() {
  markers.forEach(m => m.remove())
  markers.length = 0
  markerMeta.length = 0
  touchDragCleanups.forEach(fn => fn())
  touchDragCleanups.length = 0

  store.waypoints.forEach(wp => {
    const { wrapper, circle } = createMarkerEl(wp.order, wp.type, wp.label)
    let isDragging = false
    let hoverTimer: ReturnType<typeof setTimeout> | null = null
    let longPressTimer: ReturnType<typeof setTimeout> | null = null

    const marker = new maplibregl.Marker({ element: wrapper, draggable: true })
      .setLngLat([wp.lng, wp.lat])
      .addTo(map!)

    marker.on('dragstart', () => { isDragging = true })
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat()
      store.updatePosition(wp.id, lngLat.lat, lngLat.lng)
      setTimeout(() => { isDragging = false }, 0)
    })

    circle.addEventListener('click', (e) => {
      e.stopPropagation()
      if (isDragging || isTouchDevice) return
      openPointSheet(wp.id)
    })

    circle.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        e.stopPropagation()
        e.preventDefault()
        store.toggleType(wp.id)
      }
    })

    circle.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()
    })

    circle.addEventListener('mouseenter', () => {
      hoverTimer = setTimeout(() => showLabelInput(wp.id), 2000)
    })

    circle.addEventListener('mouseleave', () => {
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
    })

    let isDraggingTouch = false

    circle.addEventListener('touchstart', (e) => {
      e.stopPropagation()
      longPressTimer = setTimeout(() => {
        longPressTimer = null
        isDraggingTouch = true
        map?.dragPan.disable()
        wrapper.style.transition = 'transform 0.15s'
        wrapper.style.transform = 'scale(1.3)'
        wrapper.style.zIndex = '50'
      }, 600)
    }, { passive: true })

    const cancelLongPress = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
    }

    const handleDragMove = (e: TouchEvent) => {
      if (!isDraggingTouch) return
      const touch = e.touches[0]
      const rect = mapContainer.value!.getBoundingClientRect()
      const lngLat = map!.unproject([touch.clientX - rect.left, touch.clientY - rect.top])
      marker.setLngLat([lngLat.lng, lngLat.lat])
    }

    const handleDragEnd = () => {
      if (!isDraggingTouch) return
      isDraggingTouch = false
      map?.dragPan.enable()
      wrapper.style.transform = ''
      wrapper.style.zIndex = ''
      const lngLat = marker.getLngLat()
      store.updatePosition(wp.id, lngLat.lat, lngLat.lng)
    }

    mapContainer.value?.addEventListener('touchmove', handleDragMove, { passive: true })
    mapContainer.value?.addEventListener('touchend', handleDragEnd, { passive: true })
    mapContainer.value?.addEventListener('touchcancel', handleDragEnd, { passive: true })
    touchDragCleanups.push(() => {
      mapContainer.value?.removeEventListener('touchmove', handleDragMove)
      mapContainer.value?.removeEventListener('touchend', handleDragEnd)
      mapContainer.value?.removeEventListener('touchcancel', handleDragEnd)
    })

    circle.addEventListener('touchend', (e) => {
      if (isDraggingTouch) return
      e.stopPropagation()
      e.preventDefault()

      if (!longPressTimer) return
      cancelLongPress()
      openPointSheet(wp.id)
    })

    circle.addEventListener('touchmove', cancelLongPress, { passive: true })
    circle.addEventListener('touchcancel', cancelLongPress)

    markers.push(marker)
    markerMeta.push({ marker, type: wp.type })
  })

  updateSubMarkerVisibility()
}

// ── ライフサイクル ────────────────────────────────────────
onMounted(() => {
  if (!mapContainer.value) return

  fetchRainTimestamp()

  map = new maplibregl.Map({
    container: mapContainer.value,
    preserveDrawingBuffer: true,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
    center: [141.3507, 43.0686] as [number, number],
    zoom: 14,
  } as unknown as maplibregl.MapOptions)

  map.on('click', async (e) => {
    if (store.isPlaying || store.isPaused) {
      store.stop()
      return
    }
    const id = await store.addWaypoint(e.lngLat.lat, e.lngLat.lng)
    await nextTick()
    openPointSheet(id)
  })

  map.on('movestart', (e) => {
    if (e.originalEvent && (store.isPlaying || store.isPaused)) {
      store.stop()
    }
  })

  map.on('load', () => {
    mapLoaded = true

    map!.addSource('routes', {
      type: 'geojson',
      data: buildRouteGeoJSON(store.routes),
    })

    map!.addLayer({
      id: 'routes',
      type: 'line',
      source: 'routes',
      paint: {
        'line-color': '#0d6efd',
        'line-width': 4,
        'line-opacity': 0.8,
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
    })

    map!.addSource('routes-trail', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
    })

    map!.addLayer({
      id: 'routes-trail',
      type: 'line',
      source: 'routes-trail',
      paint: {
        'line-color': '#0d6efd',
        'line-width': 4,
        'line-opacity': 1,
      },
      layout: {
        visibility: 'none',
        'line-join': 'round',
        'line-cap': 'round',
      },
    })

    map!.addSource('anim-point', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
    })

    map!.addImage('anim-icon', renderIconToImageData(store.icon))

    map!.addLayer({
      id: 'anim-point-layer',
      type: 'symbol',
      source: 'anim-point',
      layout: {
        visibility: 'none',
        'icon-image': 'anim-icon',
        'icon-size': 0.75,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    })
  })
})

watch(waypoints, redrawMarkers, { deep: true })
watch(routes, updateRouteSource, { deep: true })
watch(labelSize, () => { if (mapLoaded) redrawMarkers() })

watch([isPlaying, isPaused], ([playing, paused]) => {
  if (playing && !paused) {
    startAnimation()
  } else if (!playing && paused) {
    pauseAnimation()
  } else if (!playing && !paused) {
    stopAnimation()
  }
  updateSubMarkerVisibility()
})

onUnmounted(() => {
  map?.remove()
})
</script>

<style scoped>
#map {
  flex: 1;
  height: 100%;
  position: relative;
}

/* クレジット */
.credit-label {
  position: absolute;
  top: 10px;
  left: 54px;
  z-index: 10;
  height: 36px;
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.75);
  font-size: 11px;
  font-weight: 500;
  pointer-events: none;
  letter-spacing: 0.06em;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  padding: 0 8px;
  border-radius: 6px;
}

@media (max-width: 640px) {
  .credit-label {
    top: 16px;
    left: 64px;
    height: 40px;
  }
}

/* ヘルプボタン */
.help-btn {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  width: 36px;
  height: 36px;
  background: rgba(0,0,0,0.75);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  transition: background 0.15s;
}

.help-btn:hover { background: rgba(0,0,0,0.9); }
.help-btn:active { background: black; }

@media (max-width: 640px) {
  .help-btn {
    top: 16px;
    left: 16px;
    width: 40px;
    height: 40px;
    background: rgba(0,0,0,0.65);
    border: 1px solid rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    box-shadow: none;
  }
  .help-btn:hover { background: rgba(0,0,0,0.85); }
}

/* Transition */
.mob-fade-enter-active, .mob-fade-leave-active { transition: opacity 0.2s; }
.mob-fade-enter-from, .mob-fade-leave-to { opacity: 0; }
</style>

<style>
.map-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  cursor: grab;
  user-select: none;
}

.map-marker:active {
  cursor: grabbing;
}

.map-marker--main {
  background-color: #0d6efd;
}

.map-marker--sub {
  background-color: #ffc107;
  color: #212529;
}

.marker-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.marker-label {
  background: rgba(0, 0, 0, 0.65);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
}

.label-input {
  border: none;
  outline: none;
  border-bottom: 2px solid #0d6efd;
  font-size: 13px;
  padding: 2px 4px;
  width: 140px;
  background: transparent;
}

.anim-icon-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 8;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.55));
  display: flex;
  align-items: center;
  justify-content: center;
}

.anim-icon-img {
  border-radius: 50%;
  object-fit: cover;
}

.d-none {
  display: none;
}
</style>
