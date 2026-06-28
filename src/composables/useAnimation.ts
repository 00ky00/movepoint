import { ref } from 'vue'
import type maplibregl from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapStore } from '../stores/mapStore'

const BASE_DURATION = 10

export function useAnimation(
  getMap: () => maplibregl.Map | null,
  getMapLoaded: () => boolean,
) {
  const store = useMapStore()

  let animOffset = 0
  let animLastTime = 0
  let animStepFn: (() => void) | null = null
  const currentAnimPos = ref<[number, number] | null>(null)

  function getAllCoords(): [number, number][] {
    return store.routes.flat()
  }

  function interpolate(
    a: [number, number],
    b: [number, number],
    t: number,
  ): [number, number] {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  }

  function startAnimation(onComplete?: () => void) {
    const coords = getAllCoords()
    if (coords.length < 2) return

    const map = getMap()
    if (!map) return

    if (getMapLoaded()) {
      map.setPaintProperty('routes', 'line-opacity', 0.8)
      map.setLayoutProperty('routes-trail', 'visibility', 'visible')
    }

    animLastTime = performance.now()

    const step = () => {
      if (!store.isPlaying) return

      const now = performance.now()
      animOffset += ((now - animLastTime) / 1000) * store.speed
      animLastTime = now

      const progress = Math.min(animOffset / BASE_DURATION, 1)
      const exactIdx = progress * (coords.length - 1)
      const i0 = Math.floor(exactIdx)
      const i1 = Math.min(i0 + 1, coords.length - 1)
      const pos = interpolate(coords[i0], coords[i1], exactIdx - i0)

      currentAnimPos.value = pos

      if (getMapLoaded()) {
        const trailSrc = map.getSource('routes-trail') as GeoJSONSource
        trailSrc?.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [...coords.slice(0, i0 + 1), pos] },
          properties: {},
        })
      }

      if (progress >= 1) {
        if (onComplete) {
          onComplete()
          return
        }
        animOffset = 0
        animLastTime = performance.now()
      }

      // setCenter はMapLibreの次フレームをスケジュールし、render イベントを再度発火させる
      map.setCenter(pos)
    }

    animStepFn = step
    map.on('render', step)
    map.triggerRepaint()
  }

  function pauseAnimation() {
    const map = getMap()
    if (map && animStepFn) {
      map.off('render', animStepFn)
      animStepFn = null
    }
  }

  function stopAnimation() {
    const map = getMap()
    if (map && animStepFn) {
      map.off('render', animStepFn)
      animStepFn = null
    }
    animOffset = 0
    currentAnimPos.value = null

    if (map && getMapLoaded()) {
      const trailSrc = map.getSource('routes-trail') as GeoJSONSource
      trailSrc?.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: {},
      })
      map.setLayoutProperty('routes-trail', 'visibility', 'none')
      map.setPaintProperty('routes', 'line-opacity', 0.8)
    }
  }

  return { currentAnimPos, startAnimation, pauseAnimation, stopAnimation }
}
