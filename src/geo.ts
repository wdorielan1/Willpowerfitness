import { withTimeout } from './photos'

/** Map tiles and place search. The defaults are the free OpenStreetMap services; set VITE_MAP_TILES / VITE_GEOCODE_URL to use another provider when traffic grows. */
export const TILE_URL = (import.meta.env.VITE_MAP_TILES as string | undefined) || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const GEOCODE_URL = (import.meta.env.VITE_GEOCODE_URL as string | undefined) || 'https://nominatim.openstreetmap.org/search'

export interface Place { name: string; lat: number; lng: number }

/** About one mile of precision: enough to say "this neighbourhood", never a specific house. */
export const roundCoord = (n: number) => Math.round(n * 100) / 100

interface NominatimRow { lat: string; lon: string; display_name: string; address?: Record<string, string> }
const shortName = (r: NominatimRow) => {
  const a = r.address ?? {}
  const town = a.neighbourhood || a.suburb || a.city || a.town || a.village || a.hamlet || a.municipality || a.county
  const region = a.state || a.country
  const short = [town, region].filter(Boolean).join(', ')
  return short || r.display_name.split(',').slice(0, 3).join(',').trim()
}

/** Searches towns, neighbourhoods and landmarks. Called when you press Search, not on every keystroke (the free service asks for that). */
export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url = `${GEOCODE_URL}?q=${encodeURIComponent(q)}&format=jsonv2&limit=6&addressdetails=1`
  const res = await withTimeout(fetch(url, { headers: { Accept: 'application/json' } }), 10000, 'Place search')
  if (!res.ok) throw new Error('Place search is unavailable right now. Try again in a moment.')
  const rows = (await res.json()) as NominatimRow[]
  const seen = new Set<string>()
  return rows.map((r) => ({ name: shortName(r), lat: roundCoord(parseFloat(r.lat)), lng: roundCoord(parseFloat(r.lon)) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !seen.has(p.name) && (seen.add(p.name), true))
}

export function distanceMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8, rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Your approximate position, only when you tap Near me. Never stored; the wait list saves a rounded version if you opt in. */
export const whereAmI = () => new Promise<{ lat: number; lng: number }>((resolve, reject) => {
  if (!navigator.geolocation) { reject(new Error('Your browser can’t share location.')); return }
  navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), () => reject(new Error('Location is off. You can still search the map or zoom in yourself.')), { timeout: 10000, maximumAge: 600000 })
})
