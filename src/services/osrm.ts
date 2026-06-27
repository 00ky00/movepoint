export async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: 'foot' | 'driving' = 'foot'
): Promise<[number, number][]> {
  try {
    const url = mode === 'foot'
      ? `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
      : `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    if (!data.routes?.length) return []
    return data.routes[0].geometry.coordinates
  } catch {
    return []
  }
}
