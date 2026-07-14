import type { SeismicEvent } from '@/types/seismology'

const stationDataModules = import.meta.glob('./mock/stations.dat', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const stationsRaw = stationDataModules['./mock/stations.dat'] ?? 'net,sta,lat,lon\n'

export interface StationMeta {
  net: string
  sta: string
  lat: number
  lon: number
}

const INDONESIA_LAT_MIN = -12
const INDONESIA_LAT_MAX = 12
const INDONESIA_LON_MIN = 94
const INDONESIA_LON_MAX = 142

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function mapToRange(seed: number, min: number, max: number): number {
  const span = max - min
  if (span <= 0) return min
  return min + ((seed % 10000) / 10000) * span
}

function stationKey(net: string, sta: string): string {
  return `${net}.${sta}`
}

function buildSyntheticStationCloud(event: SeismicEvent, count: number): StationMeta[] {
  const normalizedCount = Math.max(8, Math.min(42, count))
  const synthetic: StationMeta[] = []

  for (let i = 0; i < normalizedCount; i++) {
    const code = `SYN${String(i + 1).padStart(2, '0')}`
    synthetic.push(buildFallbackStation(`${event.id}:${code}`, event))
  }

  return synthetic
}

function buildFallbackStation(stationCode: string, event: SeismicEvent): StationMeta {
  const code = stationCode.trim().toUpperCase() || 'UNK'
  const origin = event.origins.find((o) => o.id === event.preferredOriginId) ?? event.origins[0]
  const originLat = origin?.latitude.value ?? -3
  const originLon = origin?.longitude.value ?? 118

  const h1 = hashString(`${code}:lat`)
  const h2 = hashString(`${code}:lon`)

  const angleDeg = h1 % 360
  const angle = (angleDeg * Math.PI) / 180
  const distanceDeg = mapToRange(h2, 2.5, 12.5)
  const isFarBranch = (h1 & 7) === 0
  const spread = isFarBranch ? distanceDeg * 1.35 : distanceDeg

  // Keep synthetic stations around event so camera framing remains close to target view.
  const lat = clamp(originLat + Math.sin(angle) * spread * 0.72, INDONESIA_LAT_MIN, INDONESIA_LAT_MAX)
  const lon = clamp(originLon + Math.cos(angle) * spread * 1.18, INDONESIA_LON_MIN, INDONESIA_LON_MAX)

  return {
    net: 'XX',
    sta: code,
    lat: Number(lat.toFixed(4)),
    lon: Number(lon.toFixed(4)),
  }
}

function parseStationsDat(raw: string): StationMeta[] {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) return []

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const netIdx = header.indexOf('net')
  const staIdx = header.indexOf('sta')
  const latIdx = header.indexOf('lat')
  const lonIdx = header.indexOf('lon')

  if (netIdx < 0 || staIdx < 0 || latIdx < 0 || lonIdx < 0) return []

  const dedup = new Map<string, StationMeta>()

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length <= Math.max(netIdx, staIdx, latIdx, lonIdx)) continue

    const net = cols[netIdx].trim().toUpperCase()
    const sta = cols[staIdx].trim().toUpperCase()
    const lat = Number.parseFloat(cols[latIdx])
    const lon = Number.parseFloat(cols[lonIdx])

    if (!net || !sta || Number.isNaN(lat) || Number.isNaN(lon)) continue

    const key = `${net}.${sta}`
    if (!dedup.has(key)) {
      dedup.set(key, { net, sta, lat, lon })
    }
  }

  return Array.from(dedup.values())
}

const STATIONS_METADATA = parseStationsDat(stationsRaw)
const STATION_BY_NET_STA = new Map(STATIONS_METADATA.map((s) => [`${s.net}.${s.sta}`, s]))

function normalizeStationTokens(raw: string): string[] {
  const upper = raw.trim().toUpperCase()
  if (!upper) return []

  const pieces = upper.split('.').map((p) => p.trim()).filter(Boolean)
  if (pieces.length >= 2) {
    return [`${pieces[0]}.${pieces[1]}`, pieces[1]]
  }

  return [upper]
}

export function getUsedStationsForEvent(event: SeismicEvent | null): StationMeta[] {
  if (!event) return []

  const fm = event.focalMechanisms.find((f) => f.id === event.preferredFocalMechanismId) ?? event.focalMechanisms[0]
  const contributions = fm?.momentTensor?.stationContributions ?? []
  if (contributions.length === 0) {
    const origin = event.origins.find((o) => o.id === event.preferredOriginId) ?? event.origins[0]
    const estimatedCount = origin?.quality?.usedStationCount
      ?? (origin?.quality?.usedPhaseCount != null ? Math.round(origin.quality.usedPhaseCount / 4) : 18)
    return buildSyntheticStationCloud(event, estimatedCount)
  }

  const fullKeys = new Set<string>()
  const stationCodes = new Set<string>()

  contributions.forEach((c) => {
    if (c.active === false) return

    const net = c.waveformId.networkCode?.trim().toUpperCase()
    const sta = c.waveformId.stationCode?.trim().toUpperCase()

    if (net && sta) fullKeys.add(`${net}.${sta}`)

    normalizeStationTokens(c.waveformId.stationCode ?? '').forEach((token) => {
      if (token.includes('.')) {
        fullKeys.add(token)
      } else {
        stationCodes.add(token)
      }
    })
  })

  const out = new Map<string, StationMeta>()

  fullKeys.forEach((key) => {
    const found = STATION_BY_NET_STA.get(key)
    if (found) out.set(`${found.net}.${found.sta}`, found)
  })

  if (stationCodes.size > 0) {
    STATIONS_METADATA.forEach((s) => {
      if (stationCodes.has(s.sta)) {
        out.set(stationKey(s.net, s.sta), s)
      }
    })
  }

  // If station metadata file is missing or does not cover returned station ids,
  // synthesize deterministic coordinates from station code so map links still render.
  stationCodes.forEach((sta) => {
    const exists = Array.from(out.values()).some((s) => s.sta === sta)
    if (!exists) {
      const fallback = buildFallbackStation(sta, event)
      out.set(stationKey(fallback.net, fallback.sta), fallback)
    }
  })

  return Array.from(out.values())
}
