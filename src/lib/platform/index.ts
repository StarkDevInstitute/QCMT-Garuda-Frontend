import type { SeismicEvent } from '@/types/seismology'
import type { EventFilter } from '@/stores/eventStore'
import { useSettingsStore } from '@/stores/settingsStore'

// ─── Platform API interface ────────────────────────────────────────────────────

export interface PlatformAPI {
  getEvents: (filter: EventFilter) => Promise<SeismicEvent[]>
  getWaveform: (params: WaveformRequest) => Promise<ArrayBuffer>
  openFile: (options?: { accept?: string }) => Promise<string | null>
  saveFile: (data: Blob, filename: string) => Promise<boolean>
}

export interface WaveformRequest {
  network: string
  station: string
  location: string
  channel: string
  startTime: Date
  endTime: Date
}

// ─── Web implementation ───────────────────────────────────────────────────────

interface AutoMtEventListItem {
  event_id: string
  origin_time: string
  latitude: number
  longitude: number
  depth_km: number
  magnitude: number
  magnitude_type: string
  phases?: number
  rms?: number
  evaluation_status?: string
  focal_mechanism_count?: number
  agency_id?: string
  region?: string
}

interface AutoMtEventListResponse {
  events: AutoMtEventListItem[]
  total_count: number
  page: number
  page_size: number
}

interface AutoMtEventDetail {
  result_id?: string
  centroid?: {
    latitude?: number
    longitude?: number
    depth_km?: number
    time?: string
    method_id?: string
    associated_station_count?: number
    used_station_count?: number
    azimuthal_gap?: number
  }
  magnitude?: {
    magnitude?: number
    type?: string
  }
  focal_mechanism?: {
    nodal_planes?: Array<{
      strike?: number
      dip?: number
      rake?: number
    }>
    evaluation_status?: string
    method_id?: string
  }
  moment_tensor?: {
    scalar_moment?: number
    variance_reduction?: number
    dc_perc?: number
    clvd_perc?: number
    iso_perc?: number
    method_id?: string
    tensor?: {
      mrr?: number
      mtt?: number
      mpp?: number
      mrt?: number
      mrp?: number
      mtp?: number
    }
  }
  station_contributions?: Array<{
    station_id?: string
    is_active?: boolean
    weight?: number
    components?: Array<{
      component?: string
      is_active?: boolean
      weight?: number
      snr?: number
      time_shift?: number
    }>
  }>
}

const AUTO_MT_EVENTS_URL = '/automt/v1/events'

function toEvaluationMode(value?: string): 'automatic' | 'manual' {
  return value === 'manual' ? 'manual' : 'automatic'
}

function toEvaluationStatus(value?: string): SeismicEvent['origins'][number]['evaluationStatus'] {
  if (value === 'preliminary' || value === 'confirmed' || value === 'reviewed' || value === 'final' || value === 'rejected') {
    return value
  }
  return undefined
}

function mapAutoMtToSeismicEvent(summary: AutoMtEventListItem, detail?: AutoMtEventDetail): SeismicEvent {
  const originId = `origin-${summary.event_id}`
  const magnitudeId = `magnitude-${summary.event_id}`
  const focalMechanismId = `focal-${summary.event_id}`
  const centroid = detail?.centroid
  const mag = detail?.magnitude
  const fm = detail?.focal_mechanism
  const mt = detail?.moment_tensor

  const originTime = centroid?.time ?? summary.origin_time
  const latitude = centroid?.latitude ?? summary.latitude
  const longitude = centroid?.longitude ?? summary.longitude
  const depthKm = centroid?.depth_km ?? summary.depth_km
  const magnitude = mag?.magnitude ?? summary.magnitude
  const magnitudeType = mag?.type ?? summary.magnitude_type

  const nodalPlane1 = fm?.nodal_planes?.[0]
  const nodalPlane2 = fm?.nodal_planes?.[1]

  return {
    id: summary.event_id,
    publicId: summary.event_id,
    type: 'earthquake',
    preferredOriginId: originId,
    preferredMagnitudeId: magnitudeId,
    preferredFocalMechanismId: (summary.focal_mechanism_count ?? 0) > 0 ? focalMechanismId : undefined,
    origins: [
      {
        id: originId,
        time: { value: new Date(originTime) },
        latitude: { value: latitude },
        longitude: { value: longitude },
        depth: { value: depthKm },
        methodId: centroid?.method_id,
        evaluationMode: toEvaluationMode(summary.evaluation_status),
        evaluationStatus: toEvaluationStatus(fm?.evaluation_status),
        quality: {
          usedPhaseCount: summary.phases,
          associatedStationCount: centroid?.associated_station_count,
          usedStationCount: centroid?.used_station_count,
          azimuthalGap: centroid?.azimuthal_gap,
          standardError: summary.rms,
        },
        region: summary.region,
        creationInfo: {
          agencyId: summary.agency_id,
        },
      },
    ],
    magnitudes: [
      {
        id: magnitudeId,
        mag: { value: magnitude },
        type: magnitudeType,
        originId,
        stationCount: summary.phases,
        evaluationMode: toEvaluationMode(summary.evaluation_status),
        creationInfo: {
          agencyId: summary.agency_id,
        },
      },
    ],
    focalMechanisms: (summary.focal_mechanism_count ?? 0) > 0
      ? [
          {
            id: focalMechanismId,
            triggeringOriginId: originId,
            nodalPlanes: {
              nodalPlane1: nodalPlane1
                ? {
                    strike: { value: nodalPlane1.strike ?? 0 },
                    dip: { value: nodalPlane1.dip ?? 0 },
                    rake: { value: nodalPlane1.rake ?? 0 },
                  }
                : undefined,
              nodalPlane2: nodalPlane2
                ? {
                    strike: { value: nodalPlane2.strike ?? 0 },
                    dip: { value: nodalPlane2.dip ?? 0 },
                    rake: { value: nodalPlane2.rake ?? 0 },
                  }
                : undefined,
            },
            momentTensor: mt
              ? {
                  id: `mt-${summary.event_id}`,
                  derivedOriginId: originId,
                  momentMagnitudeId: magnitudeId,
                  scalarMoment: mt.scalar_moment !== undefined ? { value: mt.scalar_moment } : undefined,
                  varianceReduction: mt.variance_reduction,
                  doubleCouple: mt.dc_perc !== undefined ? mt.dc_perc / 100 : undefined,
                  clvd: mt.clvd_perc !== undefined ? mt.clvd_perc / 100 : undefined,
                  iso: mt.iso_perc !== undefined ? mt.iso_perc / 100 : undefined,
                  methodId: mt.method_id,
                  tensor: mt.tensor
                    ? {
                        Mrr: { value: mt.tensor.mrr ?? 0 },
                        Mtt: { value: mt.tensor.mtt ?? 0 },
                        Mpp: { value: mt.tensor.mpp ?? 0 },
                        Mrt: { value: mt.tensor.mrt ?? 0 },
                        Mrp: { value: mt.tensor.mrp ?? 0 },
                        Mtp: { value: mt.tensor.mtp ?? 0 },
                      }
                    : undefined,
                  stationContributions: (detail?.station_contributions ?? []).flatMap((station) =>
                    (station.components ?? []).map((comp) => ({
                      waveformId: {
                        networkCode: '',
                        stationCode: station.station_id ?? '',
                        channelCode: comp.component ?? '',
                      },
                      component: comp.component,
                      active: comp.is_active,
                      weight: comp.weight ?? station.weight,
                      timeShift: comp.time_shift,
                      snr: comp.snr,
                    }))
                  ),
                }
              : undefined,
            evaluationMode: toEvaluationMode(summary.evaluation_status),
            evaluationStatus: toEvaluationStatus(fm?.evaluation_status),
            creationInfo: {
              agencyId: summary.agency_id,
            },
          },
        ]
      : [],
    creationInfo: {
      agencyId: summary.agency_id,
    },
  }
}

function extractAutoMtEvents(payload: unknown): AutoMtEventListItem[] {
  if (Array.isArray(payload)) {
    return payload as AutoMtEventListItem[]
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as {
      event_id?: unknown
      events?: unknown
      items?: unknown
      results?: unknown
      rows?: unknown
      data?: unknown[] | { events?: unknown }
    }

    if (typeof obj.event_id === 'string') {
      return [obj as AutoMtEventListItem]
    }

    if (Array.isArray(obj.events)) {
      return obj.events as AutoMtEventListItem[]
    }

    if (Array.isArray(obj.items)) {
      return obj.items as AutoMtEventListItem[]
    }

    if (Array.isArray(obj.results)) {
      return obj.results as AutoMtEventListItem[]
    }

    if (Array.isArray(obj.rows)) {
      return obj.rows as AutoMtEventListItem[]
    }

    if (Array.isArray(obj.data)) {
      return obj.data as AutoMtEventListItem[]
    }

    if (Array.isArray(obj.data?.events)) {
      return obj.data.events as AutoMtEventListItem[]
    }
  }

  return []
}

async function fetchEvents(filter: EventFilter): Promise<SeismicEvent[]> {
  void filter
  const { settings } = useSettingsStore.getState()
  const configuredUrl = settings.server.fdsnEventUrl
  const parsedConfigured = new URL(configuredUrl, window.location.origin)
  const autoMtPrefix = '/automt/v1/events'
  const autoMtIdx = parsedConfigured.pathname.indexOf(autoMtPrefix)
  const resolvedPath = autoMtIdx >= 0
    ? autoMtPrefix
    : AUTO_MT_EVENTS_URL
  const listUrl = new URL(resolvedPath, window.location.origin)
  listUrl.searchParams.set('page', '1')
  listUrl.searchParams.set('page_size', '100')

  const listResponse = await fetch(listUrl.toString(), {
    headers: { accept: 'application/json' },
  })
  if (!listResponse.ok) throw new Error(`AutoMT list error: ${listResponse.status}`)

  const listJson = (await listResponse.json()) as AutoMtEventListResponse | unknown
  const listItems = extractAutoMtEvents(listJson)
  if (listItems.length === 0) {
    throw new Error('AutoMT list response has no events array')
  }

  const details = await Promise.all(
    listItems.map(async (item) => {
      try {
        const detailResponse = await fetch(`${listUrl.origin}${listUrl.pathname}/${encodeURIComponent(item.event_id)}`, {
          headers: { accept: 'application/json' },
        })
        if (!detailResponse.ok) return undefined
        return (await detailResponse.json()) as AutoMtEventDetail
      } catch {
        return undefined
      }
    })
  )

  return listItems.map((item, idx) => mapAutoMtToSeismicEvent(item, details[idx]))
}

async function fetchWaveform(params: WaveformRequest): Promise<ArrayBuffer> {
  const url = 'https://service.iris.edu/fdsnws/dataselect/1/query'
  const query = new URLSearchParams({
    net: params.network,
    sta: params.station,
    loc: params.location || '*',
    cha: params.channel,
    start: params.startTime.toISOString(),
    end: params.endTime.toISOString(),
  })
  const response = await fetch(`${url}?${query}`)
  if (!response.ok) throw new Error(`FDSN dataselect error: ${response.status}`)
  return response.arrayBuffer()
}

async function openFileWeb(options?: { accept?: string }): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (options?.accept) input.accept = options.accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string ?? null)
      reader.readAsText(file)
    }
    input.click()
  })
}

function saveFileWeb(data: Blob, filename: string): Promise<boolean> {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return Promise.resolve(true)
}

export const webPlatform: PlatformAPI = {
  getEvents: fetchEvents,
  getWaveform: fetchWaveform,
  openFile: openFileWeb,
  saveFile: saveFileWeb,
}

// ─── Electron implementation (stub — filled in Phase 2) ──────────────────────

declare global {
  interface Window {
    electronAPI?: {
      getEvents: (filter: EventFilter) => Promise<SeismicEvent[]>
      getWaveform: (params: WaveformRequest) => Promise<ArrayBuffer>
      openFile: (options?: { accept?: string }) => Promise<string | null>
      saveFile: (data: ArrayBuffer, filename: string) => Promise<boolean>
    }
  }
}

export const electronPlatform: PlatformAPI = {
  getEvents: (filter) => window.electronAPI!.getEvents(filter),
  getWaveform: (params) => window.electronAPI!.getWaveform(params),
  openFile: (opts) => window.electronAPI!.openFile(opts),
  saveFile: async (data, filename) => {
    const buf = await data.arrayBuffer()
    return window.electronAPI!.saveFile(buf, filename)
  },
}

// ─── Auto-detect & export ─────────────────────────────────────────────────────

export const platform: PlatformAPI =
  typeof window !== 'undefined' && window.electronAPI !== undefined
    ? electronPlatform
    : webPlatform
