<template>
  <div ref="mapContainer" id="map">
    <!-- 撮影モード：スマホ枠 -->
    <div
      v-if="isRecordingMode"
      class="phone-frame"
      :style="{ width: frameSize.width + 'px', height: frameSize.height + 'px' }"
    ></div>

    <!-- 撮影モード終了ボタン -->
    <button v-if="isRecordingMode" class="record-exit-btn" @click="exitRecording" title="撮影モード終了">✕</button>

    <!-- PC オーバーレイ -->
    <div class="playback-overlay pc-only" v-if="!isRecordingMode">
      <template v-if="store.canPlay">
        <template v-if="!store.isPlaying && !store.isPaused">
          <button class="overlay-btn" @click="store.play()">▶</button>
        </template>
        <template v-else-if="store.isPlaying">
          <button class="overlay-btn" @click="store.pause()">⏸</button>
          <button class="overlay-btn" @click="store.stop()">⏹</button>
        </template>
        <template v-else>
          <button class="overlay-btn" @click="store.play()">▶</button>
          <button class="overlay-btn" @click="store.stop()">⏹</button>
        </template>
        <div class="overlay-divider"></div>
        <div class="overlay-group">
          <span class="overlay-label">速度</span>
          <input type="range" min="1" max="30" step="1" :value="store.speed"
            @input="store.speed = Number(($event.target as HTMLInputElement).value)" class="overlay-slider" />
          <span class="overlay-label">{{ store.speed }}x</span>
        </div>
        <div class="overlay-divider"></div>
      </template>
      <div class="overlay-group">
        <button v-for="s in TILE_STYLES" :key="s.id" class="ratio-btn"
          :class="{ active: currentTileStyle === s.id }" @click="switchTileStyle(s.id)">{{ s.label }}</button>
      </div>
      <div class="overlay-divider"></div>
      <div class="overlay-group">
        <span class="overlay-label">🗺</span>
        <input type="range" min="0.1" max="1" step="0.05" :value="mapOpacity"
          @input="updateMapOpacity(Number(($event.target as HTMLInputElement).value))" class="overlay-slider" />
      </div>
      <div class="overlay-divider"></div>
      <div class="overlay-group">
        <button v-for="r in RATIOS" :key="r" class="ratio-btn"
          :class="{ active: aspectRatio === r }" @click="aspectRatio = r">{{ r }}</button>
      </div>
      <div class="overlay-divider"></div>
      <button class="overlay-btn" @click="enterRecording">📷</button>
      <button class="overlay-btn" @click="store.reset()">🗑</button>
      <div class="icon-picker-wrap">
        <button class="overlay-btn icon-btn" @click="showIconPicker = !showIconPicker">
          <img v-if="store.icon.startsWith('blob:')" :src="store.icon" class="icon-option-img" />
          <span v-else>{{ store.icon }}</span>
        </button>
        <div v-if="showIconPicker" class="icon-picker-popup">
          <button v-for="ic in ICON_OPTIONS" :key="ic" class="icon-option"
            :class="{ active: store.icon === ic }" @click="store.icon = ic; showIconPicker = false">{{ ic }}</button>
          <button v-for="url in store.customIcons" :key="url" class="icon-option"
            :class="{ active: store.icon === url }" @click="store.icon = url; showIconPicker = false">
            <img :src="url" class="icon-option-img" />
          </button>
          <button class="icon-option icon-add" @click="fileInputRef?.click()">＋</button>
        </div>
      </div>
    </div>

    <!-- モバイル オーバーレイ -->
    <div class="mobile-overlay sp-only" v-if="!isRecordingMode">
      <!-- パネル -->
      <div v-if="activePanel" class="mobile-panel">
        <div v-if="activePanel === 'speed'" class="mobile-panel-content">
          <span class="panel-label">速度</span>
          <input type="range" min="1" max="30" step="1" :value="store.speed"
            @input="store.speed = Number(($event.target as HTMLInputElement).value)" class="panel-slider" />
          <span class="panel-label">{{ store.speed }}x</span>
        </div>
        <div v-if="activePanel === 'opacity'" class="mobile-panel-content">
          <span class="panel-label">🗺</span>
          <input type="range" min="0.1" max="1" step="0.05" :value="mapOpacity"
            @input="updateMapOpacity(Number(($event.target as HTMLInputElement).value))" class="panel-slider" />
        </div>
        <div v-if="activePanel === 'tile'" class="mobile-panel-content">
          <button v-for="s in TILE_STYLES" :key="s.id" class="panel-chip"
            :class="{ active: currentTileStyle === s.id }"
            @click="switchTileStyle(s.id); activePanel = null">{{ s.label }}</button>
        </div>
        <div v-if="activePanel === 'ratio'" class="mobile-panel-content">
          <button v-for="r in RATIOS" :key="r" class="panel-chip"
            :class="{ active: aspectRatio === r }"
            @click="aspectRatio = r; activePanel = null">{{ r }}</button>
        </div>
        <div v-if="activePanel === 'icon'" class="mobile-panel-content icon-grid">
          <button v-for="ic in ICON_OPTIONS" :key="ic" class="panel-icon-btn"
            :class="{ active: store.icon === ic }"
            @click="store.icon = ic; activePanel = null">{{ ic }}</button>
          <button v-for="url in store.customIcons" :key="url" class="panel-icon-btn"
            :class="{ active: store.icon === url }"
            @click="store.icon = url; activePanel = null">
            <img :src="url" class="icon-option-img" />
          </button>
          <button class="panel-icon-btn" @click="fileInputRef?.click()">＋</button>
        </div>
      </div>

      <!-- アイコンバー -->
      <div class="mobile-bar">
        <template v-if="store.canPlay">
          <template v-if="!store.isPlaying && !store.isPaused">
            <button class="mob-btn" @click="store.play()">▶</button>
          </template>
          <template v-else-if="store.isPlaying">
            <button class="mob-btn" @click="store.pause()">⏸</button>
            <button class="mob-btn" @click="store.stop()">⏹</button>
          </template>
          <template v-else>
            <button class="mob-btn" @click="store.play()">▶</button>
            <button class="mob-btn" @click="store.stop()">⏹</button>
          </template>
          <button class="mob-btn mob-btn--label" :class="{ active: activePanel === 'speed' }"
            @click="togglePanel('speed')">{{ store.speed }}x</button>
          <div class="mob-divider"></div>
        </template>
        <button class="mob-btn" :class="{ active: activePanel === 'opacity' }" @click="togglePanel('opacity')">🗺</button>
        <button class="mob-btn" :class="{ active: activePanel === 'tile' }" @click="togglePanel('tile')">🌍</button>
        <button class="mob-btn" :class="{ active: activePanel === 'ratio' }" @click="togglePanel('ratio')">📐</button>
        <button class="mob-btn" @click="enterRecording">📷</button>
        <button class="mob-btn" @click="store.reset()">🗑</button>
        <button class="mob-btn" :class="{ active: activePanel === 'icon' }" @click="togglePanel('icon')">
          <img v-if="store.icon.startsWith('blob:')" :src="store.icon" class="icon-option-img" />
          <span v-else>{{ store.icon }}</span>
        </button>
      </div>
    </div>

    <input ref="fileInputRef" type="file" accept="image/*" class="d-none" @change="onFileSelect" />

    <!-- 保存モーダル -->
    <div v-if="showSaveModal" class="modal-backdrop">
      <div class="modal-box">
        <p class="modal-title">録画を保存しますか？</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn--primary" @click="saveRecording">はい</button>
          <button class="modal-btn modal-btn--secondary" @click="discardRecording">いいえ</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapStore } from '../stores/mapStore'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null
let mapLoaded = false
const markers: maplibregl.Marker[] = []
const markerMeta: { marker: maplibregl.Marker, type: 'main' | 'sub' }[] = []
const store = useMapStore()
const { waypoints, routes, isPlaying, isPaused } = storeToRefs(store)

const isTouchDevice = navigator.maxTouchPoints > 0
const mapOpacity = ref(1)

function updateMapOpacity(val: number) {
  mapOpacity.value = val
  if (map && mapLoaded) map.setPaintProperty('osm', 'raster-opacity', val)
}

const TILE_STYLES = [
  { id: 'osm',     label: '標準', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'] },
  { id: 'light',   label: 'ライト', tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'] },
  { id: 'dark',    label: 'ダーク', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'] },
  { id: 'voyager',   label: 'クリーン', tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'] },
  { id: 'satellite', label: '衛星', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'] },
] as const
const currentTileStyle = ref('osm')

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

const ICON_OPTIONS = ['🚗','🚶','🏃','🚴','✈️','🚢','🚂','🚁','🛵','🐾']
const showIconPicker = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// モバイルパネル
const activePanel = ref<string | null>(null)
function togglePanel(name: string) {
  activePanel.value = activePanel.value === name ? null : name
}

const RATIOS = ['9:16', '1:1', '16:9'] as const
type Ratio = typeof RATIOS[number]
const aspectRatio = ref<Ratio>('9:16')
const frameSize = computed(() => {
  const sizes: Record<Ratio, { width: number; height: number }> = {
    '9:16': { width: 390, height: 693 },
    '1:1':  { width: 400, height: 400 },
    '16:9': { width: 640, height: 360 },
  }
  return sizes[aspectRatio.value]
})

// 撮影モード
const isRecordingMode = ref(false)

// 録画
let mediaRecorder: MediaRecorder | null = null
let recordingRafId: number | null = null
const showSaveModal = ref(false)
let recordingBlob: Blob | null = null

// アイコンをcanvasで描画してImageDataを生成
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

async function getIconImageData(icon: string): Promise<ImageData> {
  if (!icon.startsWith('blob:')) return renderIconToImageData(icon)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = ICON_SIZE
      c.height = ICON_SIZE
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE)
      resolve(ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE))
    }
    img.src = icon
  })
}

function startRecording() {
  if (!map) return
  const mapCanvas = map.getCanvas()
  const { width: fw, height: fh } = frameSize.value
  const dpr = window.devicePixelRatio || 1
  const outW = Math.round(fw * dpr)
  const outH = Math.round(fh * dpr)

  // マップは全画面のまま、中央をフレームサイズでクロップした中間canvasに録画
  const recCanvas = document.createElement('canvas')
  recCanvas.width = outW
  recCanvas.height = outH
  const recCtx = recCanvas.getContext('2d')!

  const copyFrame = () => {
    const sx = Math.max(0, (mapCanvas.width - outW) / 2)
    const sy = Math.max(0, (mapCanvas.height - outH) / 2)
    recCtx.drawImage(mapCanvas, sx, sy, outW, outH, 0, 0, outW, outH)
    recordingRafId = requestAnimationFrame(copyFrame)
  }
  recordingRafId = requestAnimationFrame(copyFrame)

  const stream = recCanvas.captureStream(30)
  const chunks: Blob[] = []
  const mimeType = ['video/mp4', 'video/webm;codecs=h264', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) ?? ''
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  recorder.onstop = () => {
    if (chunks.length === 0) return
    recordingBlob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
    showSaveModal.value = true
  }

  recorder.start(1000)
  mediaRecorder = recorder

  if (mapLoaded) map.setLayoutProperty('anim-point-layer', 'visibility', 'visible')
}

function stopRecording() {
  if (recordingRafId) {
    cancelAnimationFrame(recordingRafId)
    recordingRafId = null
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  mediaRecorder = null
  if (map && mapLoaded) map.setLayoutProperty('anim-point-layer', 'visibility', 'none')
}

function saveRecording() {
  if (!recordingBlob) return
  const ext = recordingBlob.type.split('/')[1]?.split(';')[0] ?? 'webm'
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const name = `movepoint_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.${ext}`
  const url = URL.createObjectURL(recordingBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  showSaveModal.value = false
  recordingBlob = null
}

function discardRecording() {
  showSaveModal.value = false
  recordingBlob = null
}

async function enterRecording() {
  isRecordingMode.value = true
  stopAnimation()
  store.isPlaying = false
  store.isPaused = false
  startRecording()
  await nextTick()
  store.play()
}

function exitRecording() {
  isRecordingMode.value = false
  store.stop()
  stopRecording()
  updateSubMarkerVisibility(false)
}

function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  store.customIcons.push(url)
  store.icon = url
  showIconPicker.value = false
  ;(e.target as HTMLInputElement).value = ''
}

// Animation
let animationId: number | null = null
let animMarker: maplibregl.Marker | null = null
let animOffset = 0 // seconds traveled at 1x speed
const BASE_DURATION = 10 // seconds at 1x speed

function getAllCoords(): [number, number][] {
  return store.routes.flat()
}

function createAnimMarkerEl() {
  const el = document.createElement('div')
  el.className = 'anim-marker'
  if (store.icon.startsWith('blob:')) {
    const img = document.createElement('img')
    img.src = store.icon
    img.className = 'icon-option-img'
    el.appendChild(img)
  } else {
    el.textContent = store.icon
  }
  return el
}

function interpolate(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function startAnimation() {
  const coords = getAllCoords()
  if (coords.length < 2) return

  // 録画中はHTMLマーカーを非表示（キャンバス上のシンボルのみ使用）
  if (!isRecordingMode.value && !animMarker) {
    const startIdx = Math.floor((animOffset / BASE_DURATION) * (coords.length - 1))
    animMarker = new maplibregl.Marker({ element: createAnimMarkerEl() })
      .setLngLat(coords[Math.min(startIdx, coords.length - 1)])
      .addTo(map!)
  }

  if (mapLoaded) {
    map!.setPaintProperty('routes', 'line-opacity', 0.2)
    map!.setLayoutProperty('routes-trail', 'visibility', 'visible')
  }

  let lastTimestamp: number | null = null

  const step = (timestamp: number) => {
    if (!store.isPlaying) return

    if (lastTimestamp !== null) {
      animOffset += ((timestamp - lastTimestamp) / 1000) * store.speed
    }
    lastTimestamp = timestamp

    const progress = Math.min(animOffset / BASE_DURATION, 1)

    // 座標間を線形補間して滑らかに移動
    const exactIdx = progress * (coords.length - 1)
    const i0 = Math.floor(exactIdx)
    const i1 = Math.min(i0 + 1, coords.length - 1)
    const t = exactIdx - i0
    const pos = interpolate(coords[i0], coords[i1], t)

    animMarker?.setLngLat(pos)

    if (mapLoaded) {
      const animSrc = map!.getSource('anim-point') as GeoJSONSource
      animSrc?.setData({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pos },
        properties: {},
      })

      const trailSrc = map!.getSource('routes-trail') as GeoJSONSource
      trailSrc?.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [...coords.slice(0, i0 + 1), pos] },
        properties: {},
      })
    }

    if (isRecordingMode.value) {
      map!.jumpTo({ center: pos })
    }

    if (progress >= 1) {
      if (isRecordingMode.value) {
        exitRecording()
        return
      }
      animOffset = 0
      lastTimestamp = null
    }

    animationId = requestAnimationFrame(step)
  }

  animationId = requestAnimationFrame(step)
}

function pauseAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  animMarker?.remove()
  animMarker = null
  animOffset = 0

  if (map && mapLoaded) {
    const trailSrc = map.getSource('routes-trail') as GeoJSONSource
    trailSrc?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} })
    map.setLayoutProperty('routes-trail', 'visibility', 'none')
    map.setPaintProperty('routes', 'line-opacity', 0.8)
  }
}

function buildRouteGeoJSON(routes: [number, number][][]) {
  return {
    type: 'FeatureCollection' as const,
    features: routes.map(coords => ({
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

function updateSubMarkerVisibility(hidden = store.isPlaying || store.isPaused) {
  markerMeta.forEach(({ marker, type }) => {
    if (type === 'sub') {
      marker.getElement().style.visibility = hidden ? 'hidden' : 'visible'
    }
  })
}

function redrawMarkers() {
  markers.forEach(m => m.remove())
  markers.length = 0
  markerMeta.length = 0

  store.waypoints.forEach(wp => {
    const { wrapper, circle } = createMarkerEl(wp.order, wp.type, wp.label)
    let isDragging = false
    let hoverTimer: ReturnType<typeof setTimeout> | null = null
    let longPressTimer: ReturnType<typeof setTimeout> | null = null
    let lastTapTime = 0

    const marker = new maplibregl.Marker({ element: wrapper, draggable: true })
      .setLngLat([wp.lng, wp.lat])
      .addTo(map!)

    marker.on('dragstart', () => { isDragging = true })
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat()
      store.updatePosition(wp.id, lngLat.lat, lngLat.lng)
      setTimeout(() => { isDragging = false }, 0)
    })

    // PC: クリックで削除
    let singleTapTimer: ReturnType<typeof setTimeout> | null = null

    // PC: クリックで削除（タッチ後の合成clickは除外）
    circle.addEventListener('click', (e) => {
      e.stopPropagation()
      if (isDragging || isTouchDevice) return
      store.removeWaypoint(wp.id)
    })

    // PC: 右クリックでタイプ切り替え
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

    // PC: 2秒ホバーでラベル入力
    circle.addEventListener('mouseenter', () => {
      hoverTimer = setTimeout(() => showLabelInput(wp.id), 2000)
    })

    circle.addEventListener('mouseleave', () => {
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
    })

    // モバイル: 長押し(600ms)でラベル入力
    circle.addEventListener('touchstart', (e) => {
      e.stopPropagation()
      longPressTimer = setTimeout(() => {
        longPressTimer = null
        showLabelInput(wp.id)
      }, 600)
    }, { passive: true })

    const cancelLongPress = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
    }

    circle.addEventListener('touchend', (e) => {
      e.stopPropagation()
      e.preventDefault() // 合成clickを抑制

      if (!longPressTimer) return // 長押し完了済み
      cancelLongPress()

      const now = Date.now()
      if (now - lastTapTime < 300) {
        // ダブルタップ → タイプ切り替え
        if (singleTapTimer) { clearTimeout(singleTapTimer); singleTapTimer = null }
        store.toggleType(wp.id)
        lastTapTime = 0
      } else {
        // シングルタップ仮判定 → 300ms後に2回目が来なければ削除
        lastTapTime = now
        const capturedTime = now
        singleTapTimer = setTimeout(() => {
          if (lastTapTime === capturedTime) store.removeWaypoint(wp.id)
        }, 300)
      }
    })

    circle.addEventListener('touchmove', cancelLongPress, { passive: true })
    circle.addEventListener('touchcancel', cancelLongPress)

    markers.push(marker)
    markerMeta.push({ marker, type: wp.type })
  })

  updateSubMarkerVisibility()
}

onMounted(() => {
  if (!mapContainer.value) return

  map = new maplibregl.Map({
    container: mapContainer.value,
    preserveDrawingBuffer: true,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
    center: [141.3507, 43.0686] as [number, number],
    zoom: 14,
  } as unknown as maplibregl.MapOptions)

  map.addControl(new maplibregl.NavigationControl(), 'top-right')
  map.on('click', (e) => {
    if (isRecordingMode.value) return
    store.addWaypoint(e.lngLat.lat, e.lngLat.lng)
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
watch(() => store.icon, async (newIcon) => {
  if (!map || !mapLoaded) return
  const data = await getIconImageData(newIcon)
  if (map.hasImage('anim-icon')) map.updateImage('anim-icon', data)
})
watch([isPlaying, isPaused], ([playing, paused]) => {
  if (playing && !paused) {
    startAnimation()
  } else if (!playing && paused) {
    pauseAnimation()
  } else if (!playing && !paused) {
    stopAnimation()
  }
  updateSubMarkerVisibility(playing || paused)
})

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isRecordingMode.value) exitRecording()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  map?.remove()
})
</script>

<style scoped>
#map {
  flex: 1;
  height: 100%;
  position: relative;
}

.playback-overlay {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(15, 15, 15, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 8px 14px;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}

.overlay-btn {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  flex-shrink: 0;
}

.overlay-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.overlay-btn:active {
  background: rgba(255, 255, 255, 0.25);
}

.overlay-btn:disabled,
.ratio-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

.overlay-label {
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.overlay-slider {
  width: 100px;
  accent-color: white;
  cursor: pointer;
}

.overlay-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
  margin: 0 2px;
}

.overlay-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-picker-wrap {
  position: relative;
}

/* 撮影モード */
.phone-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
  z-index: 15;
  pointer-events: none;
}

.ratio-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  padding: 3px 7px;
  border-radius: 6px;
  cursor: pointer;
  line-height: 1;
  transition: all 0.15s;
  white-space: nowrap;
}

.ratio-btn:hover {
  border-color: rgba(255, 255, 255, 0.5);
  color: white;
}

.ratio-btn.active {
  border-color: white;
  color: white;
  background: rgba(255, 255, 255, 0.15);
}

.record-exit-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 20;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.record-exit-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  backdrop-filter: blur(4px);
}

.modal-box {
  background: rgba(20, 20, 20, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-title {
  color: white;
  font-size: 16px;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-btn {
  border: none;
  border-radius: 8px;
  padding: 8px 28px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.15s;
}

.modal-btn:hover {
  opacity: 0.85;
}

.modal-btn--primary {
  background: #0d6efd;
  color: white;
}

.modal-btn--secondary {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

/* PC/SP 出し分け */
.sp-only { display: none; }

@media (max-width: 640px) {
  .pc-only { display: none !important; }
  .sp-only { display: flex; }
  .phone-frame { display: none; }
}

/* モバイルオーバーレイ */
.mobile-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  flex-direction: column;
  align-items: stretch;
}

.mobile-panel {
  background: rgba(15, 15, 15, 0.85);
  border-top: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  padding: 14px 16px;
}

.mobile-panel-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.mobile-panel-content.icon-grid {
  gap: 6px;
}

.panel-label {
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  white-space: nowrap;
}

.panel-slider {
  flex: 1;
  accent-color: white;
  cursor: pointer;
}

.panel-chip {
  background: none;
  border: 1px solid rgba(255,255,255,0.25);
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.15s;
}

.panel-chip.active {
  border-color: white;
  color: white;
  background: rgba(255,255,255,0.15);
}

.panel-icon-btn {
  background: none;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 26px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  color: white;
  transition: border-color 0.15s;
}

.panel-icon-btn.active {
  border-color: white;
}

.mobile-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(15, 15, 15, 0.82);
  border-top: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  padding: 10px 12px;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.mobile-bar::-webkit-scrollbar {
  display: none;
}

.mob-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}

.mob-btn:active,
.mob-btn.active {
  background: rgba(255,255,255,0.15);
}

.mob-btn--label {
  font-size: 12px;
  font-weight: 600;
  width: auto;
  padding: 0 8px;
  color: rgba(255,255,255,0.7);
}

.mob-btn--label.active {
  color: white;
}

.mob-divider {
  width: 1px;
  height: 20px;
  background: rgba(255,255,255,0.15);
  flex-shrink: 0;
  margin: 0 2px;
}

.icon-btn {
  font-size: 22px;
  padding: 0 4px;
}

.icon-picker-popup {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  border-radius: 10px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  white-space: nowrap;
}

.icon-option {
  background: none;
  border: 2px solid transparent;
  border-radius: 6px;
  font-size: 22px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: border-color 0.15s;
}

.icon-option:hover {
  border-color: rgba(255, 255, 255, 0.5);
}

.icon-option.active {
  border-color: white;
}

.icon-option-img {
  width: 22px;
  height: 22px;
  object-fit: cover;
  border-radius: 50%;
}

.icon-add {
  color: white;
  font-size: 18px;
}

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

.anim-marker {
  font-size: 22px;
  line-height: 1;
  cursor: default;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
