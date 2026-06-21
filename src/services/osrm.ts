export async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    if (!data.routes?.length) return []
    return data.routes[0].geometry.coordinates
  } catch {
    return []
  }
}
