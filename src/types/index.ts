export interface Waypoint {
  id: string
  lat: number
  lng: number
  order: number
  type: 'main' | 'sub'
  label?: string
}
