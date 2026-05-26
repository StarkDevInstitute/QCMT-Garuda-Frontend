import { useEffect, useRef } from 'react'
import type { SeismicEvent } from '@/types/seismology'
import { useEventStore } from '@/stores/eventStore'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

interface WorldMapProps {
  events: SeismicEvent[]
}

const DEPTH_BANDS = [
  { label: '< 35 km', color: '#ef4444', desc: 'Shallow' },
  { label: '35–70 km', color: '#f97316', desc: 'Intermediate' },
  { label: '70–300 km', color: '#eab308', desc: 'Deep' },
  { label: '> 300 km', color: '#3b82f6', desc: 'Very Deep' },
]

function depthColor(depth: number): string {
  if (depth < 35) return '#ef4444'
  if (depth < 70) return '#f97316'
  if (depth < 300) return '#eab308'
  return '#3b82f6'
}

function magRadius(mag: number): number {
  return Math.max(5, Math.min(22, (mag - 3) * 3.5))
}

export function WorldMap({ events }: WorldMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.CircleMarker[]>([])
  const { selectedEventId, setSelectedEvent } = useEventStore()

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, {
      center: [0, 118],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('http://202.90.198.104:7078/tiles/wrsmap_tiles/{z}/{x}/{y}.png', {
      maxZoom: 19,
      errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    }).addTo(map)

    // Custom zoom control (top-right)
    L.control.zoom({ position: 'topright' }).addTo(map)

    L.control.attribution({ position: 'bottomright', prefix: '' })
      .addAttribution('© BMKG')
      .addTo(map)

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    events.forEach((event) => {
      const origin =
        event.origins.find((o) => o.id === event.preferredOriginId) ?? event.origins[0]
      const mag =
        event.magnitudes.find((m) => m.id === event.preferredMagnitudeId) ?? event.magnitudes[0]
      if (!origin) return

      const lat = origin.latitude.value
      const lon = origin.longitude.value
      const depth = origin.depth?.value ?? 0
      const magnitude = mag?.mag.value ?? 0
      const isSelected = event.id === selectedEventId

      const marker = L.circleMarker([lat, lon], {
        radius: magRadius(magnitude) + (isSelected ? 3 : 0),
        fillColor: depthColor(depth),
        fillOpacity: isSelected ? 1 : 0.75,
        color: isSelected ? '#ffffff' : 'rgba(0,0,0,0.3)',
        weight: isSelected ? 2.5 : 1,
      })

      const depthLabel = depth < 35 ? 'Shallow' : depth < 70 ? 'Intermediate' : depth < 300 ? 'Deep' : 'Very Deep'
      marker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;line-height:1.6">
          <strong>${event.id}</strong><br/>
          Mw <strong>${magnitude.toFixed(1)}</strong> &nbsp;·&nbsp; ${depth} km (${depthLabel})<br/>
          <span style="opacity:0.8">${origin.region ?? ''}</span>
        </div>`,
        { direction: 'top', offset: [0, -8], className: 'leaflet-tooltip-dark' }
      )

      marker.on('click', () => setSelectedEvent(event.id))
      marker.addTo(map)
      markersRef.current.push(marker)
    })
  }, [events, selectedEventId, setSelectedEvent])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Depth legend */}
      <div className="absolute bottom-6 left-2 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded p-2 space-y-1">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
          Depth
        </div>
        {DEPTH_BANDS.map(({ label, color, desc }) => (
          <div key={desc} className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
              style={{ background: color }}
            />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
        <div className="mt-1.5 pt-1.5 border-t border-border/50">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Size = Mag</div>
        </div>
      </div>
    </div>
  )
}

