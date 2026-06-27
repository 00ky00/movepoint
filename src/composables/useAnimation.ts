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

  let animationId: number | null = null
  let animOffset = 0
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

  function startAnimation() {
    const coords = getAllCoords()
    if (coords.length < 2) return

    const map = getMap()
    if (!map) return

    if (getMapLoaded()) {
      map.setPaintProperty('routes', 'line-opacity', 0.8)
      map.setLayoutProperty('routes-trail', 'visibility', 'visible')
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

      currentAnimPos.value = pos
      map.jumpTo({ center: pos })

      if (getMapLoaded()) {
        const animSrc = map.getSource('anim-point') as GeoJSONSource
        animSrc?.setData({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: pos },
          properties: {},
        })

        const trailSrc = map.getSource('routes-trail') as GeoJSONSource
        trailSrc?.setData({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [...coords.slice(0, i0 + 1), pos],
          },
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
    currentAnimPos.value = null

    const map = getMap()
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
