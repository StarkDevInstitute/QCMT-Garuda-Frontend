import type { SeismicEvent } from '@/types/seismology'
import stationsRaw from '../../../../q_cmt/analysis/data/stations.dat?raw'

export interface StationMeta {
  net: string
  sta: string
  lat: number
  lon: number
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
  if (contributions.length === 0) return []

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
        out.set(`${s.net}.${s.sta}`, s)
      }
    })
  }

  return Array.from(out.values())
}
