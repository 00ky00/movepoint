<template>
  <div ref="mapContainer" id="map">
    <!-- PC 右サイドパネル -->
    <div class="pc-panel pc-only" :class="{ 'pc-panel--closed': !panelOpen }">
      <button class="panel-toggle-btn" @click="panelOpen = !panelOpen">{{ panelOpen ? '›' : '‹' }}</button>

      <div class="pc-panel-content" v-show="panelOpen">

      <!-- モード -->
      <div class="panel-section">
        <div class="section-label">ルートモード</div>
        <div class="mode-toggle">
          <span class="mode-icon" :class="{ active: store.routeMode === 'foot' }">🚶</span>
          <div class="toggle-track" @click="store.setRouteMode(store.routeMode === 'foot' ? 'driving' : 'foot')">
            <div class="toggle-thumb" :class="{ right: store.routeMode === 'driving' }"></div>
          </div>
          <span class="mode-icon" :class="{ active: store.routeMode === 'driving' }">🚗</span>
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
            @click="switchTileStyle(s.id)">{{ s.label }}</button>
        </div>
      </div>

      <!-- 透過 -->
      <div class="panel-section">
        <div class="section-label">透過</div>
        <input type="range" min="0.1" max="1" step="0.05" :value="mapOpacity"
          @input="updateMapOpacity(Number(($event.target as HTMLInputElement).value))"
          class="panel-slider" />
      </div>

      <!-- 再生コントロール -->
      <div class="panel-section panel-controls">
        <button
          class="ctrl-btn ctrl-btn--play"
          :disabled="!store.canPlay"
          @click="store.isPlaying ? store.pause() : store.play()"
        >{{ store.isPlaying ? '⏸' : '▶' }}</button>
        <button class="ctrl-btn" :disabled="!store.isPlaying && !store.isPaused" @click="store.stop()">⏹</button>
        <button class="ctrl-btn ctrl-btn--text" :disabled="!store.isPaused" @click="captureImage">保存</button>
        <button class="ctrl-btn ctrl-btn--text" @click="store.reset()">リセット</button>
      </div>

      <!-- アイコン / ラベル -->
      <div class="panel-section">
        <div class="section-label">アイコン {{ iconSize }}px</div>
        <input type="range" min="16" max="80" step="2" :value="iconSize"
          @input="iconSize = Number(($event.target as HTMLInputElement).value)"
          class="panel-slider" style="margin-bottom:14px" />
        <div class="section-label">ラベル {{ labelSize }}px</div>
        <input type="range" min="8" max="24" step="1" :value="labelSize"
          @input="labelSize = Number(($event.target as HTMLInputElement).value)"
          class="panel-slider" style="margin-bottom:10px" />
        <div class="icon-row">
          <div class="icon-preview">
            <img v-if="store.icon.startsWith('blob:')" :src="store.icon" class="icon-preview-img" />
            <span v-else class="icon-preview-emoji">{{ store.icon }}</span>
          </div>
          <button class="icon-upload-btn" @click="fileInputRef?.click()">画像を選択</button>
          <button v-if="store.icon.startsWith('blob:')" class="icon-reset-btn"
            @click="store.icon = store.routeMode === 'foot' ? '🚶' : '🚗'">✕</button>
        </div>
      </div>

      <!-- ウェイポイント一覧 -->
      <div class="panel-section" v-if="store.waypoints.length > 0">
        <div class="section-label">ポイント</div>
        <div class="wp-list">
          <button v-for="wp in store.waypoints" :key="wp.id"
            class="wp-list-item" @click="openPointSheet(wp.id)">
            <div class="wp-list-dot" :class="wp.type === 'main' ? 'wp-dot--main' : 'wp-dot--sub'">
              {{ wp.order }}
            </div>
            <span class="wp-list-label">{{ wp.label || '（ラベルなし）' }}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" class="wp-list-edit-icon">
              <path d="M9.5 1.5a1.5 1.5 0 012.12 2.12L4.5 10.75 2 11.5l.75-2.5L9.5 1.5z"/>
            </svg>
          </button>
        </div>
      </div>

      </div> <!-- /pc-panel-content -->
    </div>

    <!-- モバイル UI (Stories スタイル) -->
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
    <button class="mob-settings-btn sp-only" @click="showBottomSheet = true">
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
      <button class="mob-side-btn mob-side-btn--text" :disabled="!store.isPaused" @click="captureImage">保存</button>
    </div>

    <!-- アニメーションアイコン（マップ中央固定） -->
    <Transition name="mob-fade">
      <div v-if="store.isPlaying || store.isPaused" class="anim-icon-center">
        <img v-if="store.icon.startsWith('blob:')" :src="store.icon"
          :style="`width:${iconSize}px;height:${iconSize}px`" class="anim-icon-img" />
        <span v-else :style="`font-size:${iconSize}px;line-height:1`">{{ store.icon }}</span>
      </div>
    </Transition>

    <!-- ポイント追加シート backdrop -->
    <Transition name="mob-fade">
      <div v-if="pointSheet" class="point-sheet-backdrop" @click="confirmPointSheet"></div>
    </Transition>

    <!-- ポイント追加シート -->
    <Transition name="mob-slide">
      <div v-if="pointSheet" class="point-sheet">
        <div class="sheet-handle-bar"></div>
        <div class="point-sheet-body">
          <div class="point-sheet-row">
            <div class="point-dot" :class="pointSheet.isMain ? 'point-dot--main' : 'point-dot--sub'">
              {{ pointSheet.order }}
            </div>
            <div v-if="pointSheet.order > 1" class="type-toggle-pill">
              <button class="type-btn" :class="{ active: pointSheet.isMain }" @click="pointSheet.isMain = true">メイン</button>
              <button class="type-btn" :class="{ active: !pointSheet.isMain }" @click="pointSheet.isMain = false">サブ</button>
            </div>
            <span v-else class="point-type-fixed">メイン（固定）</span>
          </div>
          <input v-if="pointSheet.isMain" ref="pointSheetInput" type="text" v-model="pointSheet.label"
            placeholder="ラベルを入力（任意）" class="point-sheet-input"
            @keydown.enter="confirmPointSheet" />
          <button class="point-sheet-confirm" @click="confirmPointSheet">完了</button>
          <button class="point-sheet-delete" @click="deleteFromPointSheet">このポイントを削除</button>
        </div>
      </div>
    </Transition>

    <!-- ボトムシート backdrop -->
    <Transition name="mob-fade">
      <div v-if="showBottomSheet" class="sheet-backdrop sp-only" @click="showBottomSheet = false"></div>
    </Transition>

    <!-- ボトムシート -->
    <Transition name="mob-slide">
      <div v-if="showBottomSheet" class="bottom-sheet sp-only"
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
                @click="switchTileStyle(s.id)">{{ s.label }}</button>
            </div>
          </div>
          <div class="sheet-row">
            <span class="sheet-label">透過</span>
            <input type="range" min="0.1" max="1" step="0.05" :value="mapOpacity"
              @input="updateMapOpacity(Number(($event.target as HTMLInputElement).value))" class="sheet-slider" />
          </div>
          <div class="sheet-row">
            <span class="sheet-label">アイコン {{ iconSize }}px</span>
            <input type="range" min="16" max="80" step="2" :value="iconSize"
              @input="iconSize = Number(($event.target as HTMLInputElement).value)" class="sheet-slider" />
          </div>
          <div class="sheet-row">
            <span class="sheet-label">ラベル {{ labelSize }}px</span>
            <input type="range" min="8" max="24" step="1" :value="labelSize"
              @input="labelSize = Number(($event.target as HTMLInputElement).value)" class="sheet-slider" />
          </div>
          <div class="sheet-row">
            <span class="sheet-label">アイコン画像</span>
            <div class="sheet-icon-row">
              <div class="icon-preview">
                <img v-if="store.icon.startsWith('blob:')" :src="store.icon" class="icon-preview-img" />
                <span v-else class="icon-preview-emoji">{{ store.icon }}</span>
              </div>
              <button class="sheet-chip" @click="fileInputRef?.click()">画像を選択</button>
              <button v-if="store.icon.startsWith('blob:')" class="sheet-chip sheet-chip--reset"
                @click="store.icon = store.routeMode === 'foot' ? '🚶' : '🚗'">✕</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <input ref="fileInputRef" type="file" accept="image/*" class="d-none" @change="onFileSelect" />

    <!-- ヘルプボタン -->
    <button class="help-btn" @click="showHelpModal = true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="8" r="7.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <text x="8" y="12.5" text-anchor="middle" font-size="10" font-weight="bold" font-family="serif">i</text>
      </svg>
    </button>

    <!-- ヘルプモーダル -->
    <Transition name="mob-fade">
      <div v-if="showHelpModal" class="help-backdrop" @click.self="showHelpModal = false">
        <div class="help-modal">
          <button class="help-close" @click="showHelpModal = false">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M1 1l12 12M13 1L1 13"/>
            </svg>
          </button>

          <div class="help-hero">
            <div class="help-app-name">ルートスナップ</div>
            <div class="help-tagline">旅の移動ルートをビジュアルで共有</div>
          </div>

          <div class="help-steps">
            <div class="help-step">
              <div class="help-step-num">1</div>
              <div class="help-step-body">
                <div class="help-step-title">地図をタップしてポイントを追加</div>
                <div class="help-step-desc">行った場所・行く場所をマークする。ポイント間のルートは自動で引かれる。</div>
              </div>
            </div>
            <div class="help-step">
              <div class="help-step-num">2</div>
              <div class="help-step-body">
                <div class="help-step-title">再生してアニメーションを確認</div>
                <div class="help-step-desc">アイコンがルートに沿って移動する。速度やアイコン画像は自由に変えられる。</div>
              </div>
            </div>
            <div class="help-step">
              <div class="help-step-num">3</div>
              <div class="help-step-body">
                <div class="help-step-title">一時停止 → 保存で画像を出力</div>
                <div class="help-step-desc">ルートとアイコンが収まった縦長画像（9:16）が生成される。インスタのストーリーにそのまま使える。</div>
              </div>
            </div>
          </div>

          <div class="help-section">
            <div class="help-section-title">ポイントの種類</div>
            <div class="help-type-row">
              <div class="help-dot help-dot--main">1</div>
              <div>
                <div class="help-type-name">メイン</div>
                <div class="help-type-desc">主要な目的地。ラベルをつけられる。保存画像に表示される。</div>
              </div>
            </div>
            <div class="help-type-row">
              <div class="help-dot help-dot--sub">2</div>
              <div>
                <div class="help-type-name">サブ</div>
                <div class="help-type-desc">経由地。ルートの精度を上げるためのポイント。保存画像には出ない。</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- キャプチャ待機オーバーレイ -->
    <Transition name="mob-fade">
      <div v-if="isCapturing" class="capture-overlay">
        <div class="capture-spinner"></div>
        <span class="capture-text">準備中...</span>
      </div>
    </Transition>

    <!-- 画像プレビュー: PC モーダル -->
    <div v-if="showImageModal" class="modal-backdrop image-modal-backdrop pc-only" @click.self="showImageModal = false">
      <div class="image-modal-box">
        <button class="image-modal-close" @click="showImageModal = false">✕</button>
        <img :src="capturedImageUrl" class="image-modal-preview" />
        <p class="image-modal-hint">右クリック → 画像を保存</p>
        <a :href="capturedImageUrl" download="movepoint.png" class="image-modal-download">ダウンロード</a>
      </div>
    </div>

    <!-- 画像プレビュー: モバイル全画面 -->
    <div v-if="showImageModal" class="mob-image-fullscreen sp-only">
      <button class="mob-image-close" @click="showImageModal = false">✕</button>
      <img :src="capturedImageUrl" class="mob-image-img" />
      <p class="mob-image-hint">長押しで保存</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapStore } from '../stores/mapStore'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null
let mapLoaded = false
const markers: maplibregl.Marker[] = []
const markerMeta: { marker: maplibregl.Marker, type: 'main' | 'sub' }[] = []
const touchDragCleanups: (() => void)[] = []
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
const currentTileStyle = ref('voyager')

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

const fileInputRef = ref<HTMLInputElement | null>(null)
const showImageModal = ref(false)
const capturedImageUrl = ref('')
const isCapturing = ref(false)

function waitForMapReady(): Promise<void> {
  return new Promise(resolve => {
    const check = () => {
      if (map!.areTilesLoaded()) resolve()
      else map!.once('idle', check)
    }
    map!.once('idle', check)
  })
}

async function captureImage() {
  if (!map || !mapLoaded) return
  isCapturing.value = true
  const allCoords = store.routes.flat()
  if (allCoords.length === 0) return

  const prevCenter = map.getCenter()
  const prevZoom = map.getZoom()

  const dpr = window.devicePixelRatio || 1

  // クロップ寸法を先に計算してfitBoundsのpaddingに反映
  const mapCanvas = map.getCanvas()
  const cw = mapCanvas.width   // 物理ピクセル
  const ch = mapCanvas.height  // 物理ピクセル
  const targetAspect = 9 / 16
  const basePad = 80           // CSS論理ピクセル

  let sx: number, sy: number, sw: number, sh: number
  let fitPad: { top: number; bottom: number; left: number; right: number }
  if (cw / ch > targetAspect) {
    sh = ch; sw = Math.round(ch * targetAspect); sx = Math.round((cw - sw) / 2); sy = 0
    const extra = (cw - sw) / 2 / dpr  // 論理ピクセルに変換
    fitPad = { top: basePad, bottom: basePad, left: basePad + extra, right: basePad + extra }
  } else {
    sw = cw; sh = Math.round(cw / targetAspect); sx = 0; sy = Math.round((ch - sh) / 2)
    const extra = (ch - sh) / 2 / dpr  // 論理ピクセルに変換
    fitPad = { top: basePad + extra, bottom: basePad + extra, left: basePad, right: basePad }
  }

  const lngs = allCoords.map(c => c[0])
  const lats = allCoords.map(c => c[1])
  map.fitBounds(
    new maplibregl.LngLatBounds([Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]),
    { padding: fitPad, duration: 0 }
  )
  await waitForMapReady()

  // ルートを全表示してから再描画を待つ
  map.setPaintProperty('routes', 'line-opacity', 0.8)
  map.setLayoutProperty('routes-trail', 'visibility', 'none')
  map.triggerRepaint()
  await waitForMapReady()

  const outW = 1080, outH = 1920
  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW; outCanvas.height = outH
  const ctx = outCanvas.getContext('2d')!

  // マップ本体を描画
  ctx.drawImage(mapCanvas, sx, sy, sw, sh, 0, 0, outW, outH)

  const scaleX = outW / sw
  const scaleY = outH / sh

  function project(lng: number, lat: number): { x: number; y: number } {
    const px = map!.project([lng, lat])
    // project() は論理ピクセルを返すので dpr を掛けて物理ピクセルに揃える
    return { x: (px.x * dpr - sx) * scaleX, y: (px.y * dpr - sy) * scaleY }
  }

  // ウェイポイントマーカーを描画（mainのみ）
  const r = 24
  store.waypoints.filter(wp => wp.type === 'main').forEach(wp => {
    const { x, y } = project(wp.lng, wp.lat)

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = wp.type === 'main' ? '#0d6efd' : '#ffc107'
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = wp.type === 'main' ? 'white' : '#212529'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(wp.order), x, y)

    if (wp.label) {
      const labelY = y + r + 6
      const drawLabelSize = Math.round(labelSize.value * outW * dpr / sw)
      ctx.font = `${drawLabelSize}px sans-serif`
      const tw = ctx.measureText(wp.label).width
      const lw = tw + 16, lh = drawLabelSize + 10
      ctx.fillStyle = 'rgba(0,0,0,0.65)'
      ctx.beginPath()
      ctx.roundRect(x - lw / 2, labelY, lw, lh, 5)
      ctx.fill()
      ctx.fillStyle = 'white'
      ctx.textBaseline = 'top'
      ctx.fillText(wp.label, x, labelY + 5)
    }
  })

  // アニメーションアイコンを描画
  if (currentAnimPos) {
    const { x, y } = project(currentAnimPos[0], currentAnimPos[1])
    const drawSize = Math.round(iconSize.value * outW * dpr / sw)
    if (!store.icon.startsWith('blob:')) {
      ctx.font = `${drawSize}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(store.icon, x, y)
    } else {
      await new Promise<void>(resolve => {
        const img = new Image()
        img.onload = () => { ctx.drawImage(img, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize); resolve() }
        img.onerror = () => resolve()
        img.src = store.icon
      })
    }
  }

  capturedImageUrl.value = outCanvas.toDataURL('image/png')
  isCapturing.value = false
  showImageModal.value = true

  // 状態を戻す
  isCapturing.value = false
  map.jumpTo({ center: prevCenter, zoom: prevZoom })
  if (store.isPaused) {
    map.setPaintProperty('routes', 'line-opacity', 0.2)
    map.setLayoutProperty('routes-trail', 'visibility', 'visible')
  }
}

const showHelpModal = ref(true)
const panelOpen = ref(true)
const iconSize = ref(40)
const labelSize = ref(11)

// ポイント追加シート（モバイル）
const pointSheet = ref<{ id: string; label: string; isMain: boolean; order: number } | null>(null)
const pointSheetInput = ref<HTMLInputElement | null>(null)

function openPointSheet(id: string) {
  const wp = store.waypoints.find(w => w.id === id)
  if (!wp) return
  pointSheet.value = { id, label: wp.label || '', isMain: wp.type === 'main', order: wp.order }
  nextTick(() => pointSheetInput.value?.focus())
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

// モバイルボトムシート
const showBottomSheet = ref(false)
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
  if (sheetDragY.value > 100) showBottomSheet.value = false
  sheetDragY.value = 0
}

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

// Animation
let animationId: number | null = null
let animOffset = 0
let currentAnimPos: [number, number] | null = null
const BASE_DURATION = 10

function getAllCoords(): [number, number][] {
  return store.routes.flat()
}

function interpolate(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function startAnimation() {
  const coords = getAllCoords()
  if (coords.length < 2) return

  if (mapLoaded) {
    map!.setPaintProperty('routes', 'line-opacity', 0.8)
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

    const exactIdx = progress * (coords.length - 1)
    const i0 = Math.floor(exactIdx)
    const i1 = Math.min(i0 + 1, coords.length - 1)
    const t = exactIdx - i0
    const pos = interpolate(coords[i0], coords[i1], t)

    currentAnimPos = pos
    map!.jumpTo({ center: pos })

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

    if (progress >= 1) {
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
  animOffset = 0
  currentAnimPos = null

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
      if (isDraggingTouch) return  // ドラッグ終了はmapContainerリスナーで処理
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
    const id = await store.addWaypoint(e.lngLat.lat, e.lngLat.lng)
    await nextTick()
    openPointSheet(id)
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

.image-modal-backdrop {
  background: rgba(0, 0, 0, 0.85);
}

.image-modal-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-height: 92vh;
  position: relative;
}

.image-modal-close {
  position: absolute;
  top: -8px;
  right: -8px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.image-modal-preview {
  max-height: 75vh;
  max-width: 90vw;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.image-modal-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin: 0;
  text-align: center;
}

.image-modal-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin: 0;
  text-align: center;
}

.image-modal-download {
  color: white;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 20px;
  border-radius: 20px;
  text-decoration: none;
  transition: background 0.15s;
}

.image-modal-download:hover { background: rgba(255, 255, 255, 0.25); }

/* PC/SP 出し分け */
.sp-only { display: none; }

@media (max-width: 640px) {
  .pc-only { display: none !important; }
  .sp-only { display: flex; }
}

/* ===== モバイル Stories スタイル ===== */

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

/* ヘルプモーダル */
.help-backdrop {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.help-modal {
  background: rgba(16,16,16,0.98);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  width: min(380px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  scrollbar-width: none;
  position: relative;
}

.help-modal::-webkit-scrollbar { display: none; }

.help-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  background: rgba(255,255,255,0.07);
  border: none;
  border-radius: 50%;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  z-index: 1;
}
.help-close:hover { background: rgba(255,255,255,0.14); color: white; }

.help-hero {
  padding: 32px 24px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.help-app-name {
  font-size: 22px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.03em;
  margin-bottom: 6px;
}

.help-tagline {
  font-size: 14px;
  color: rgba(255,255,255,0.45);
}

.help-steps {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.help-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.help-step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.help-step-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.help-step-desc {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  line-height: 1.6;
}

.help-section {
  padding: 20px 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.help-section-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.help-type-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.help-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  border: 2px solid rgba(255,255,255,0.4);
  flex-shrink: 0;
  margin-top: 2px;
}

.help-dot--main { background: #0d6efd; color: white; }
.help-dot--sub { background: #ffc107; color: #212529; }

.help-type-name {
  font-size: 13px;
  font-weight: 600;
  color: white;
  margin-bottom: 3px;
}

.help-type-desc {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  line-height: 1.6;
}

/* キャプチャ待機オーバーレイ */
.capture-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.capture-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.capture-text {
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  font-weight: 500;
}

/* ポイント追加シート */
.point-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 28;
  background: rgba(0,0,0,0.4);
}

.point-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  background: rgba(18, 18, 18, 0.97);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border-top: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(24px);
  flex-direction: column;
  padding-bottom: max(24px, env(safe-area-inset-bottom));
  display: flex;
}

.point-sheet-body {
  padding: 12px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.point-sheet-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.point-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: white;
  border: 2px solid rgba(255,255,255,0.8);
  flex-shrink: 0;
}

.point-dot--main { background: #0d6efd; }
.point-dot--sub { background: #ffc107; color: #212529; }

.type-toggle-pill {
  display: flex;
  background: rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 3px;
}

.type-btn {
  padding: 6px 18px;
  border-radius: 16px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.type-btn.active {
  background: rgba(255,255,255,0.15);
  color: white;
}

.point-type-fixed {
  color: rgba(255,255,255,0.3);
  font-size: 12px;
}

.point-sheet-input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  color: white;
  font-size: 16px;
  padding: 14px 16px;
  outline: none;
  transition: border-color 0.15s;
}

.point-sheet-input::placeholder { color: rgba(255,255,255,0.2); }
.point-sheet-input:focus { border-color: rgba(255,255,255,0.3); }

.point-sheet-confirm {
  width: 100%;
  height: 52px;
  background: white;
  color: #111;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.point-sheet-confirm:active { opacity: 0.8; }

.point-sheet-delete {
  width: 100%;
  height: 44px;
  background: transparent;
  color: rgba(255, 80, 80, 0.8);
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.point-sheet-delete:active {
  background: rgba(255, 80, 80, 0.1);
  color: rgba(255, 80, 80, 1);
}

/* モバイル全画面プレビュー */
.mob-image-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: black;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.mob-image-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.mob-image-close {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  right: 16px;
  z-index: 51;
  width: 36px;
  height: 36px;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
  font-size: 16px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mob-image-hint {
  position: absolute;
  bottom: max(24px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
}

/* Transition アニメーション */
.mob-fade-enter-active, .mob-fade-leave-active { transition: opacity 0.2s; }
.mob-fade-enter-from, .mob-fade-leave-to { opacity: 0; }

.mob-slide-enter-active, .mob-slide-leave-active { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
.mob-slide-enter-from, .mob-slide-leave-to { transform: translateY(100%); }

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
</style>
