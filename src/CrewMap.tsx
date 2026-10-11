import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { TILE_ATTRIBUTION, TILE_URL } from './geo'

export interface MapCrew { id: string; name: string; lat: number; lng: number }

/** The map itself (loaded only when someone opens the Map view). Pins are plain markers, so no image files are needed. */
export default function CrewMap({ crews, selectedId, onSelect, focus }: { crews: MapCrew[]; selectedId: string | null; onSelect: (id: string | null) => void; focus: { lat: number; lng: number } | null }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const fitted = useRef(false)

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { center: [30, -20], zoom: 2, minZoom: 2, worldCopyJump: true })
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(m)
    m.on('click', () => onSelect(null))
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    // the container may still be sizing when the map is created
    setTimeout(() => m.invalidateSize(), 50)
    return () => { m.remove(); map.current = null; layer.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const m = map.current, g = layer.current
    if (!m || !g) return
    g.clearLayers()
    for (const c of crews) {
      const icon = L.divIcon({ className: 'map-pin-wrap', html: `<span class="map-pin${c.id === selectedId ? ' on' : ''}" role="img" aria-label="${c.name.replace(/"/g, '')}"></span>`, iconSize: [26, 26], iconAnchor: [13, 24] })
      L.marker([c.lat, c.lng], { icon, keyboard: true, title: c.name }).on('click', (e) => { L.DomEvent.stopPropagation(e); onSelect(c.id) }).addTo(g)
    }
    if (!fitted.current && crews.length && !focus) {
      fitted.current = true
      m.fitBounds(L.latLngBounds(crews.map((c) => [c.lat, c.lng] as [number, number])), { padding: [40, 40], maxZoom: 11 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crews, selectedId])

  useEffect(() => { if (focus && map.current) map.current.setView([focus.lat, focus.lng], 10) }, [focus])
  useEffect(() => {
    const c = crews.find((x) => x.id === selectedId)
    if (c && map.current) map.current.panTo([c.lat, c.lng])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  return <div ref={el} className="crew-map" role="application" aria-label="Map of crews" />
}
