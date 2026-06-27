import { defineStore } from 'pinia'
import type { Waypoint } from '../types'
import { fetchRoute } from '../services/osrm'

export const useMapStore = defineStore('map', {
  state: (): {
    waypoints: Waypoint[]
    routes: [number, number][][]
    isPlaying: boolean
    isPaused: boolean
    speed: number
    icon: string
    routeMode: 'foot' | 'driving'
  } => ({
    waypoints: [],
    routes: [],
    isPlaying: false,
    isPaused: false,
    speed: 1,
    icon: '🚶',
    routeMode: 'foot',
  }),
  getters: {
    canPlay: (state) => state.routes.length > 0 && state.routes.some(r => r.length > 0),
  },
  actions: {
    async addWaypoint(lat: number, lng: number) {
      const wp: Waypoint = {
        id: crypto.randomUUID(),
        lat,
        lng,
        order: this.waypoints.length + 1,
        type: 'main',
      }
      this.waypoints.push(wp)

      if (this.waypoints.length >= 2) {
        const prev = this.waypoints[this.waypoints.length - 2]
        const coords = await fetchRoute(prev, wp, this.routeMode)
        this.routes.push(coords)
      }
    },

    async removeWaypoint(id: string) {
      const idx = this.waypoints.findIndex(w => w.id === id)
      if (idx === -1) return

      this.waypoints.splice(idx, 1)
      this.waypoints.forEach((w, i) => { w.order = i + 1 })

      if (this.waypoints.length === 0) {
        this.routes = []
        return
      }

      if (idx === 0) {
        this.routes.splice(0, 1)
      } else if (idx >= this.waypoints.length) {
        this.routes.splice(this.routes.length - 1, 1)
      } else {
        this.routes.splice(idx - 1, 2)
        const coords = await fetchRoute(this.waypoints[idx - 1], this.waypoints[idx], this.routeMode)
        this.routes.splice(idx - 1, 0, coords)
      }
    },

    async updatePosition(id: string, lat: number, lng: number) {
      const idx = this.waypoints.findIndex(w => w.id === id)
      if (idx === -1) return
      this.waypoints[idx].lat = lat
      this.waypoints[idx].lng = lng

      const promises: Promise<void>[] = []
      if (idx > 0) {
        const from = this.waypoints[idx - 1]
        const to = this.waypoints[idx]
        promises.push(fetchRoute(from, to, this.routeMode).then(coords => { this.routes[idx - 1] = coords }))
      }
      if (idx < this.waypoints.length - 1) {
        const from = this.waypoints[idx]
        const to = this.waypoints[idx + 1]
        promises.push(fetchRoute(from, to, this.routeMode).then(coords => { this.routes[idx] = coords }))
      }
      await Promise.all(promises)
    },

    async setRouteMode(mode: 'foot' | 'driving') {
      if (this.routeMode === mode) return
      this.routeMode = mode
      if (!this.icon.startsWith('blob:')) {
        this.icon = mode === 'foot' ? '🚶' : '🚗'
      }

      if (this.waypoints.length < 2) return
      const newRoutes = await Promise.all(
        this.waypoints.slice(0, -1).map((wp, i) =>
          fetchRoute(wp, this.waypoints[i + 1], mode)
        )
      )
      this.routes = newRoutes
    },

    toggleType(id: string) {
      const wp = this.waypoints.find(w => w.id === id)
      if (wp && wp.order !== 1) wp.type = wp.type === 'main' ? 'sub' : 'main'
    },

    setLabel(id: string, label: string) {
      const wp = this.waypoints.find(w => w.id === id)
      if (wp) wp.label = label.trim()
    },

    reset() {
      this.waypoints = []
      this.routes = []
      this.isPlaying = false
      this.isPaused = false
    },

    play() {
      if (!this.canPlay) return
      this.isPlaying = true
      this.isPaused = false
    },

    pause() {
      this.isPlaying = false
      this.isPaused = true
    },

    stop() {
      this.isPlaying = false
      this.isPaused = false
    },
  },
})
