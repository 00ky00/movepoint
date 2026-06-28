import { ref } from 'vue'
import type { Ref } from 'vue'
import maplibregl from 'maplibre-gl'
import { useMapStore } from '../stores/mapStore'

export function useCapture(
  getMap: () => maplibregl.Map | null,
  getMapLoaded: () => boolean,
  iconSize: Ref<number>,
  labelSize: Ref<number>,
  currentAnimPos: Ref<[number, number] | null>,
  iconRotation?: Ref<number>,
  markerColor?: string,
) {
  const store = useMapStore()
  const isCapturing = ref(false)
  const showImageModal = ref(false)
  const capturedImageUrl = ref('')

  function waitForMapReady(map: maplibregl.Map): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (map.areTilesLoaded()) resolve()
        else map.once('idle', check)
      }
      map.once('idle', check)
    })
  }

  async function captureImage() {
    const map = getMap()
    if (!map || !getMapLoaded()) return
    isCapturing.value = true
    const allCoords = store.routes.flat()
    if (allCoords.length === 0) {
      isCapturing.value = false
      return
    }

    const prevCenter = map.getCenter()
    const prevZoom = map.getZoom()

    const dpr = window.devicePixelRatio || 1

    const mapCanvas = map.getCanvas()
    const cw = mapCanvas.width
    const ch = mapCanvas.height
    const targetAspect = 9 / 16
    const basePad = 80

    let sx: number, sy: number, sw: number, sh: number
    let fitPad: { top: number; bottom: number; left: number; right: number }
    if (cw / ch > targetAspect) {
      sh = ch
      sw = Math.round(ch * targetAspect)
      sx = Math.round((cw - sw) / 2)
      sy = 0
      const extra = (cw - sw) / 2 / dpr
      fitPad = {
        top: basePad,
        bottom: basePad,
        left: basePad + extra,
        right: basePad + extra,
      }
    } else {
      sw = cw
      sh = Math.round(cw / targetAspect)
      sx = 0
      sy = Math.round((ch - sh) / 2)
      const extra = (ch - sh) / 2 / dpr
      fitPad = {
        top: basePad + extra,
        bottom: basePad + extra,
        left: basePad,
        right: basePad,
      }
    }

    const lngs = allCoords.map(c => c[0])
    const lats = allCoords.map(c => c[1])
    map.fitBounds(
      new maplibregl.LngLatBounds(
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ),
      { padding: fitPad, duration: 0 },
    )
    await waitForMapReady(map)

    map.setPaintProperty('routes', 'line-opacity', 0.8)
    map.setLayoutProperty('routes-trail', 'visibility', 'none')
    map.triggerRepaint()
    await waitForMapReady(map)

    const outW = 1080,
      outH = 1920
    const outCanvas = document.createElement('canvas')
    outCanvas.width = outW
    outCanvas.height = outH
    const ctx = outCanvas.getContext('2d')!

    ctx.drawImage(mapCanvas, sx, sy, sw, sh, 0, 0, outW, outH)

    const scaleX = outW / sw
    const scaleY = outH / sh

    function project(
      lng: number,
      lat: number,
    ): { x: number; y: number } {
      const px = map!.project([lng, lat])
      return {
        x: (px.x * dpr - sx) * scaleX,
        y: (px.y * dpr - sy) * scaleY,
      }
    }

    const r = 36
    store.waypoints.forEach(wp => {
        const { x, y } = project(wp.lng, wp.lat)

        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        if (wp.type === 'main') {
          const grad = ctx.createLinearGradient(x - r, y - r, x + r, y + r)
          const stops = (markerColor ?? '#667eea,#764ba2').split(',')
          grad.addColorStop(0, stops[0])
          grad.addColorStop(1, stops[1] ?? stops[0])
          ctx.fillStyle = grad
        } else {
          ctx.fillStyle = '#94a3b8'
        }
        ctx.fill()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 4
        ctx.stroke()

        ctx.fillStyle = 'white'
        ctx.font = 'bold 26px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(wp.order), x, y)

        if (wp.label) {
          const labelY = y + r + 8
          const drawLabelSize = Math.round(
            (labelSize.value * outW * dpr) / sw,
          )
          ctx.font = `bold ${drawLabelSize}px 'Noto Sans JP', sans-serif`
          const tw = ctx.measureText(wp.label).width
          const padX = drawLabelSize * 0.6
          const padY = drawLabelSize * 0.35
          const lw = tw + padX * 2
          const lh = drawLabelSize + padY * 2
          const radius = lh / 2
          // 白ピル with shadow
          ctx.shadowColor = 'rgba(0,0,0,0.18)'
          ctx.shadowBlur = 14
          ctx.shadowOffsetY = 3
          ctx.fillStyle = 'white'
          ctx.beginPath()
          ctx.roundRect(x - lw / 2, labelY, lw, lh, radius)
          ctx.fill()
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetY = 0
          ctx.fillStyle = '#1a1a1a'
          ctx.textBaseline = 'top'
          ctx.fillText(wp.label, x, labelY + padY)
        }
      })

    if (currentAnimPos.value) {
      const { x, y } = project(
        currentAnimPos.value[0],
        currentAnimPos.value[1],
      )
      const drawSize = Math.round((iconSize.value * outW * dpr) / sw)
      const rot = ((iconRotation?.value ?? 0) * Math.PI) / 180

      ctx.save()
      ctx.translate(x, y)
      if (rot !== 0) ctx.rotate(rot)

      if (!store.icon.startsWith('blob:')) {
        ctx.font = `${drawSize}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(store.icon, 0, 0)
      } else {
        await new Promise<void>(resolve => {
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
            resolve()
          }
          img.onerror = () => resolve()
          img.src = store.icon
        })
      }

      ctx.restore()
    }

    // ロゴ（右上・ローマ字・モダン）
    const logoSize = Math.round(outW * 0.036)
    const logoRx = outW - 56  // 右端基準
    const logoTy = 64          // 上端基準

    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    // "Route" と "Snap" を別スタイルで右寄せ描画
    ctx.font = `300 ${logoSize}px 'Helvetica Neue', Arial, sans-serif`
    const routeW = ctx.measureText('Route').width
    ctx.font = `bold ${logoSize}px 'Helvetica Neue', Arial, sans-serif`
    const snapW = ctx.measureText('Snap').width
    const totalW = routeW + Math.round(logoSize * 0.08) + snapW

    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 2

    ctx.font = `300 ${logoSize}px 'Helvetica Neue', Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillText('Route', logoRx - totalW, logoTy)

    ctx.font = `bold ${logoSize}px 'Helvetica Neue', Arial, sans-serif`
    ctx.fillStyle = 'white'
    ctx.fillText('Snap', logoRx - snapW, logoTy)

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    capturedImageUrl.value = outCanvas.toDataURL('image/png')
    isCapturing.value = false
    showImageModal.value = true

    map.jumpTo({ center: prevCenter, zoom: prevZoom })
    if (store.isPaused) {
      map.setPaintProperty('routes', 'line-opacity', 0.2)
      map.setLayoutProperty('routes-trail', 'visibility', 'visible')
    }
  }

  return { isCapturing, showImageModal, capturedImageUrl, captureImage }
}
