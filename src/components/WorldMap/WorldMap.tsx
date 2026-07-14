import { useEffect, useRef } from 'react'
import type { SeismicEvent } from '@/types/seismology'
import { useEventStore } from '@/stores/eventStore'
import { getUsedStationsForEvent } from '@/lib/stations'
import { faultNormal, slipVector, radiationSign, plotToNED } from '@/components/BeachBall/beachball-geometry'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

interface WorldMapProps {
  events: SeismicEvent[]
}

const MAP_MIN_ZOOM = 3
const MAP_MAX_ZOOM = 8
const WORLD_BOUNDS = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180))
const DEFAULT_EVENT_ZOOM = 6
const MAP_FIT_PADDING = 34

const STATION_ICON_WIDTH = 16
const STATION_ICON_HEIGHT = 16
const STATION_ICON_COLOR = '#2563eb'

const EPICENTER_RADIUS = 18
const EPICENTER_STROKE = 2.2
const EPICENTER_FILL_OPACITY = 0.82

const BEACHBALL_SIZE = 48
const BEACHBALL_OFFSET: [number, number] = [40, -30]
const BEACHBALL_CONNECTOR_COLOR = '#000000'
const BEACHBALL_CONNECTOR_WEIGHT = 1.8

const STATION_LINK_COLOR = '#ffffff'
const STATION_LINK_WEIGHT = 1.4
  const STATION_LINK_OPACITY = 0.216
const STATION_LINK_SEGMENTS = 56

function focalDepthColor(depth: number): string {
  if (depth < 60) return '#ff0000'   // red
  if (depth <= 300) return '#ffff00' // yellow
  return '#00ff00'                   // green
}

function createTriangleStationIcon(): L.DivIcon {
  const halfW = Math.floor(STATION_ICON_WIDTH / 2)
  const halfH = Math.floor(STATION_ICON_HEIGHT / 2)
  const stem = STATION_ICON_HEIGHT - 2
  return L.divIcon({
    className: '',
    iconSize: [STATION_ICON_WIDTH, STATION_ICON_HEIGHT],
    iconAnchor: [halfW, halfH + 4],
    html: `<div style="width:0;height:0;border-left:${halfW}px solid transparent;border-right:${halfW}px solid transparent;border-bottom:${stem}px solid ${STATION_ICON_COLOR};filter:drop-shadow(0 1px 1px rgba(0,0,0,.45));"></div>`,
  })
}

function createBeachballIcon(event: SeismicEvent, depth: number): L.Icon | null {
  const fm = event.focalMechanisms.find((f) => f.id === event.preferredFocalMechanismId) ?? event.focalMechanisms[0]
  const np1 = fm?.nodalPlanes?.nodalPlane1 ?? {
    strike: { value: 120 },
    dip: { value: 50 },
    rake: { value: 90 },
  }
  const np2 = fm?.nodalPlanes?.nodalPlane2 ?? {
    strike: { value: 300 },
    dip: { value: 40 },
    rake: { value: 95 },
  }
  const color = focalDepthColor(depth)

  const size = BEACHBALL_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 1

  const n1 = faultNormal(np1.strike.value, np1.dip.value)
  const l1 = slipVector(np1.strike.value, np1.dip.value, np1.rake.value)
  const n2 = faultNormal(np2.strike.value, np2.dip.value)
  const l2 = slipVector(np2.strike.value, np2.dip.value, np2.rake.value)

  const imgData = ctx.createImageData(size, size)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = (px - cx) / radius
      const ny = -(py - cy) / radius
      const gamma = plotToNED(nx, ny)
      if (!gamma) continue

      const a1 = radiationSign(n1, l1, gamma)
      const a2 = radiationSign(n2, l2, gamma)
      const a = Math.abs(a1) >= Math.abs(a2) ? a1 : a2
      const absA = Math.abs(a)

      const idx = (py * size + px) * 4
      if (absA < 0.03) {
        imgData.data[idx] = 0
        imgData.data[idx + 1] = 0
        imgData.data[idx + 2] = 0
        imgData.data[idx + 3] = 255
      } else if (a >= 0) {
        imgData.data[idx] = 255
        imgData.data[idx + 1] = 255
        imgData.data[idx + 2] = 255
        imgData.data[idx + 3] = 255
      } else {
        imgData.data[idx] = Number.parseInt(color.slice(1, 3), 16)
        imgData.data[idx + 1] = Number.parseInt(color.slice(3, 5), 16)
        imgData.data[idx + 2] = Number.parseInt(color.slice(5, 7), 16)
        imgData.data[idx + 3] = 255
      }
    }
  }
  ctx.putImageData(imgData, 0, 0)

  ctx.globalCompositeOperation = 'destination-in'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  ctx.stroke()

  return L.icon({
    iconUrl: canvas.toDataURL('image/png'),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

function centeredFitZoom(
  map: L.Map,
  center: [number, number],
  points: Array<[number, number]>,
  paddingPx = MAP_FIT_PADDING,
  minZoom = MAP_MIN_ZOOM,
  maxZoom = MAP_MAX_ZOOM,
  defaultZoom = DEFAULT_EVENT_ZOOM
): number {
  if (points.length === 0) return defaultZoom

  const size = map.getSize()
  const halfW = Math.max(1, size.x / 2 - paddingPx)
  const halfH = Math.max(1, size.y / 2 - paddingPx)
  const crs = map.options.crs ?? L.CRS.EPSG3857

  for (let z = maxZoom; z >= minZoom; z--) {
    const c = map.project(L.latLng(center[0], center[1]), z)
    const worldW = crs.scale(z)
    let fits = true

    for (const p of points) {
      const q = map.project(L.latLng(p[0], p[1]), z)
      const dxRaw = q.x - c.x
      const dx = Math.min(
        Math.abs(dxRaw),
        Math.abs(dxRaw - worldW),
        Math.abs(dxRaw + worldW)
      )
      const dy = Math.abs(q.y - c.y)
      if (dx > halfW || dy > halfH) {
        fits = false
        break
      }
    }

    if (fits) return z
  }

  return minZoom
}

function toCartesian(lat: number, lon: number): [number, number, number] {
  const latR = toRad(lat)
  const lonR = toRad(lon)
  const c = Math.cos(latR)
  return [c * Math.cos(lonR), c * Math.sin(lonR), Math.sin(latR)]
}

function greatCirclePath(
  start: [number, number],
  end: [number, number],
  segments = STATION_LINK_SEGMENTS
): [number, number][] {
  const a = toCartesian(start[0], start[1])
  const b = toCartesian(end[0], end[1])
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const omega = Math.acos(dot)

  if (omega < 1e-8) return [start, end]

  const sinOmega = Math.sin(omega)
  const path: [number, number][] = []
  let prevLon: number | null = null

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const s1 = Math.sin((1 - t) * omega) / sinOmega
    const s2 = Math.sin(t * omega) / sinOmega

    const x = s1 * a[0] + s2 * b[0]
    const y = s1 * a[1] + s2 * b[1]
    const z = s1 * a[2] + s2 * b[2]

    const len = Math.hypot(x, y, z) || 1
    const nx = x / len
    const ny = y / len
    const nz = z / len

    const lat = toDeg(Math.asin(nz))
    let lon = toDeg(Math.atan2(ny, nx))

    if (prevLon != null) {
      while (lon - prevLon > 180) lon -= 360
      while (lon - prevLon < -180) lon += 360
    }
    prevLon = lon

    path.push([lat, lon])
  }

  return path
}

export function WorldMap({ events }: WorldMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const stationMarkersRef = useRef<L.Marker[]>([])
  const focalMarkersRef = useRef<L.Layer[]>([])
  const stationLinksRef = useRef<L.Polyline[]>([])
  const lastAutoFramedEventIdRef = useRef<string | null>(null)
  const { selectedEventId } = useEventStore()

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, {
      center: [0, 118],
      zoom: 4,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      zoomControl: false,
      attributionControl: false,
      maxBounds: WORLD_BOUNDS,
      maxBoundsViscosity: 1,
    })

    L.tileLayer('http://202.90.198.104:7078/tiles/wrsmap_tiles/{z}/{x}/{y}.png', {
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      maxNativeZoom: MAP_MAX_ZOOM,
      noWrap: true,
      bounds: WORLD_BOUNDS,
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

    stationMarkersRef.current.forEach((m) => m.remove())
    stationMarkersRef.current = []
    focalMarkersRef.current.forEach((m) => m.remove())
    focalMarkersRef.current = []
    stationLinksRef.current.forEach((l) => l.remove())
    stationLinksRef.current = []

    const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null
    const selectedOrigin = selectedEvent
      ? (selectedEvent.origins.find((o) => o.id === selectedEvent.preferredOriginId) ?? selectedEvent.origins[0])
      : null

    if (selectedEvent && selectedOrigin) {
      const lat = selectedOrigin.latitude.value
      const lon = selectedOrigin.longitude.value
      const depth = selectedOrigin.depth?.value ?? 0
      const fmColor = focalDepthColor(depth)
      const epicenter: [number, number] = [lat, lon]
      const epicenterPoint = map.latLngToLayerPoint(L.latLng(lat, lon))
      const focalPoint = epicenterPoint.add(BEACHBALL_OFFSET)
      const focalLatLng = map.layerPointToLatLng(focalPoint)

      const epicenterRing = L.circleMarker([lat, lon], {
        radius: EPICENTER_RADIUS,
        color: fmColor,
        weight: EPICENTER_STROKE,
        fillColor: fmColor,
        fillOpacity: EPICENTER_FILL_OPACITY,
      }).addTo(map)
      focalMarkersRef.current.push(epicenterRing)

      const beachballIcon = createBeachballIcon(selectedEvent, depth)
      if (beachballIcon) {
        const connector = L.polyline([
          [lat, lon],
          [focalLatLng.lat, focalLatLng.lng],
        ], {
          color: BEACHBALL_CONNECTOR_COLOR,
          weight: BEACHBALL_CONNECTOR_WEIGHT,
          opacity: 0.95,
          interactive: false,
        }).addTo(map)
        focalMarkersRef.current.push(connector)

        const beachball = L.marker([focalLatLng.lat, focalLatLng.lng], { icon: beachballIcon }).addTo(map)
        beachball.bindTooltip(
          `<div style="font-family:monospace;font-size:12px;line-height:1.5">
            <strong>${selectedEvent.id}</strong><br/>
            Epicenter + focal mechanism
          </div>`,
          { direction: 'top', offset: [0, -16], className: 'leaflet-tooltip-dark' }
        )
        focalMarkersRef.current.push(beachball)
      }

      const stationIcon = createTriangleStationIcon()
      const usedStations = getUsedStationsForEvent(selectedEvent)
      const fitPoints: Array<[number, number]> = []
      usedStations.forEach((s) => {
        const staMarker = L.marker([s.lat, s.lon], { icon: stationIcon })
        staMarker.bindTooltip(
          `<div style="font-family:monospace;font-size:11px"><strong>${s.net}.${s.sta}</strong><br/>Station used in inversion</div>`,
          { direction: 'top', offset: [0, -8], className: 'leaflet-tooltip-dark' }
        )
        staMarker.addTo(map)
        stationMarkersRef.current.push(staMarker)

        const arc = greatCirclePath([lat, lon], [s.lat, s.lon])
        const link = L.polyline(arc, {
          color: STATION_LINK_COLOR,
          weight: STATION_LINK_WEIGHT,
          opacity: STATION_LINK_OPACITY,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(map)
        stationLinksRef.current.push(link)
        fitPoints.push([s.lat, s.lon])
      })

      if (beachballIcon) {
        fitPoints.push([focalLatLng.lat, focalLatLng.lng])
      }

      const shouldAutoFrame = selectedEvent.id !== lastAutoFramedEventIdRef.current
      if (shouldAutoFrame) {
        const zoom = centeredFitZoom(map, epicenter, fitPoints)
        map.setView([lat, lon], zoom, { animate: false })
        lastAutoFramedEventIdRef.current = selectedEvent.id
      }
    }

    if (!selectedEvent) {
      lastAutoFramedEventIdRef.current = null
    }

  }, [events, selectedEventId])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}

