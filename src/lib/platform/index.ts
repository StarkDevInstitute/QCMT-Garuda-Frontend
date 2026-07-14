import type { SeismicEvent } from '@/types/seismology'
import type { EventFilter } from '@/stores/eventStore'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  getAutoMTClient,
  type InteractiveJobInitRequest,
  type InteractiveJobResponse,
  type AsyncStepResponse,
  type JobProgressResponse,
  type StationInfo,
  type InversionRequest,
  type StationSelectionRequest,
  type PatchStationsRequest,
  type PatchFrequencyRequest,
  type PatchDistanceBoundsRequest,
  type ManualTimeShiftRequest,
  type GuiWaveformDataResponse,
  type WaveformKind,
  type CentroidSolution,
  type JobResultResponse,
  type Checkpoint,
  type PatchHistoryResponse,
  type ProcessingStage,
} from '@/lib/api/automt-client'

// ─── Platform API interface ────────────────────────────────────────────────────

export interface PlatformAPI {
  // Event catalog (existing)
  getEvents: (filter: EventFilter) => Promise<PagedEventsResult>
  getEventById: (eventId: string) => Promise<SeismicEvent>
  getWaveform: (params: WaveformRequest) => Promise<ArrayBuffer>
  openFile: (options?: { accept?: string }) => Promise<string | null>
  saveFile: (data: Blob, filename: string) => Promise<boolean>

  // Job management (AutoMT interactive processing)
  createInteractiveJob: (request: InteractiveJobInitRequest) => Promise<AsyncStepResponse>
  getJob: (jobId: string) => Promise<InteractiveJobResponse>
  getJobProgress: (jobId: string) => Promise<JobProgressResponse>
  deleteJob: (jobId: string) => Promise<void>

  // Stage execution
  runStationPrep: (jobId: string) => Promise<AsyncStepResponse>
  runWaveformPrep: (jobId: string) => Promise<AsyncStepResponse>
  runStationSelection: (jobId: string, request: StationSelectionRequest) => Promise<AsyncStepResponse>
  runInversion: (jobId: string, request: InversionRequest) => Promise<AsyncStepResponse>
  runFinalize: (jobId: string) => Promise<AsyncStepResponse>

  // Station management
  getJobStations: (jobId: string) => Promise<StationInfo[]>
  patchStations: (jobId: string, request: PatchStationsRequest) => Promise<void>
  toggleStationSelection: (jobId: string, stationId: string) => Promise<void>
  applyStationTimeShift: (jobId: string, stationId: string, timeShift: number) => Promise<void>

  // Waveform data
  getJobWaveforms: (jobId: string, kind?: WaveformKind, stationId?: string) => Promise<GuiWaveformDataResponse>

  // Solutions & results
  getJobSolutions: (jobId: string, stage?: ProcessingStage | 'all') => Promise<CentroidSolution[]>
  getJobResults: (jobId: string) => Promise<JobResultResponse>
  downloadJobResultFile: (jobId: string, filename: string) => Promise<Blob>

  // Parameter adjustments
  patchFrequency: (jobId: string, fmin?: number, fmax?: number) => Promise<void>
  patchDistanceBounds: (jobId: string, minDist?: number, maxDist?: number) => Promise<void>

  // Checkpoints
  listCheckpoints: (jobId: string) => Promise<Checkpoint[]>
  restoreCheckpoint: (jobId: string, checkpointId: string) => Promise<void>

  // Patch history
  getPatchHistory: (jobId: string) => Promise<PatchHistoryResponse>

  // Task polling
  pollTaskStatus: (taskId: string) => Promise<{ status: string; message?: string; error?: string }>
  cancelTask: (taskId: string) => Promise<void>

  // SSE stream URLs
  getTaskLogStreamUrl: (taskId: string) => string
  getTaskResultStreamUrl: (taskId: string) => string
}

export interface PagedEventsResult {
  events: SeismicEvent[]
  page: number
  pageSize: number
  totalCount?: number
  hasPrevPage: boolean
  hasNextPage: boolean
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

interface AutoMtQueryParams {
  page: number
  page_size: number
  method_id?: string
  focal_mechanism_quality?: string
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

function buildAutoMtQuery(filter: EventFilter): AutoMtQueryParams {
  const quality = filter.focalMechanismQuality?.trim().toUpperCase()
  return {
    page: Math.max(1, filter.page || 1),
    page_size: Math.max(1, filter.pageSize || 50),
    method_id: filter.methodId || undefined,
    focal_mechanism_quality: quality && quality !== 'ALL' ? quality : undefined,
  }
}

function readTotalCount(payload: unknown): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined

  const obj = payload as {
    total_count?: unknown
    total?: unknown
    count?: unknown
    pagination?: { total?: unknown; total_count?: unknown }
  }

  const direct = obj.total_count ?? obj.total ?? obj.count
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct

  const nested = obj.pagination?.total_count ?? obj.pagination?.total
  if (typeof nested === 'number' && Number.isFinite(nested)) return nested

  return undefined
}

function getPreferredOrigin(event: SeismicEvent) {
  return event.origins.find((o) => o.id === event.preferredOriginId) ?? event.origins[0]
}

function applyUiFilters(events: SeismicEvent[], filter: EventFilter): SeismicEvent[] {
  const now = Date.now()
  const hasExplicitTimeRange = Boolean(filter.dateFrom || filter.dateTo)
  const fromTs = filter.dateFrom?.getTime() ?? Number.NEGATIVE_INFINITY
  const toTs = filter.dateTo?.getTime() ?? now
  const regionNeedle = filter.region.trim().toLowerCase()

  return events.filter((event) => {
    const origin = getPreferredOrigin(event)
    if (!origin) return false

    const t = origin.time.value.getTime()
    if (hasExplicitTimeRange && (Number.isNaN(t) || t < fromTs || t > toTs)) return false

    if (filter.hideOtherFake && (event.type === 'not existing' || event.type === 'not reported')) {
      return false
    }

    if (filter.showOnlyOwn) {
      const agency = (origin.creationInfo?.agencyId ?? event.creationInfo?.agencyId ?? '').toUpperCase()
      if (agency !== 'BMKG') return false
    }

    if (filter.showOnlyPreferred && (!event.preferredOriginId || !event.preferredMagnitudeId)) {
      return false
    }

    if (filter.hideOutside && regionNeedle && regionNeedle !== '- custom -') {
      const region = (origin.region ?? '').toLowerCase()
      if (!region.includes(regionNeedle)) return false
    }

    return true
  })
}

function resolveEventsEndpoint(configuredUrl: string): URL {
  const trimmed = configuredUrl.trim()
  if (!trimmed) {
    return new URL(AUTO_MT_EVENTS_URL, window.location.origin)
  }

  try {
    return new URL(trimmed)
  } catch {
    return new URL(trimmed, window.location.origin)
  }
}

function buildSummaryFromDetail(eventId: string, detail: AutoMtEventDetail): AutoMtEventListItem {
  return {
    event_id: eventId,
    origin_time: detail.centroid?.time ?? new Date(0).toISOString(),
    latitude: detail.centroid?.latitude ?? 0,
    longitude: detail.centroid?.longitude ?? 0,
    depth_km: detail.centroid?.depth_km ?? 0,
    magnitude: detail.magnitude?.magnitude ?? 0,
    magnitude_type: detail.magnitude?.type ?? 'M',
    evaluation_status: detail.focal_mechanism?.evaluation_status,
    focal_mechanism_count: detail.focal_mechanism ? 1 : 0,
  }
}

function extractAutoMtDetail(payload: unknown): AutoMtEventDetail {
  if (!payload || typeof payload !== 'object') return {}

  const obj = payload as {
    data?: unknown
    result?: unknown
    event?: unknown
  }

  if (obj.data && typeof obj.data === 'object') return obj.data as AutoMtEventDetail
  if (obj.result && typeof obj.result === 'object') return obj.result as AutoMtEventDetail
  if (obj.event && typeof obj.event === 'object') return obj.event as AutoMtEventDetail

  return payload as AutoMtEventDetail
}

async function fetchEventById(eventId: string): Promise<SeismicEvent> {
  const { settings } = useSettingsStore.getState()
  const baseUrl = resolveEventsEndpoint(settings.server.fdsnEventUrl)
  baseUrl.search = ''

  try {
    const detailUrl = `${baseUrl.origin}${baseUrl.pathname}/${encodeURIComponent(eventId)}`
    const response = await fetch(detailUrl, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`AutoMT detail error: ${response.status}`)

    const raw = (await response.json()) as unknown
    const detail = extractAutoMtDetail(raw)
    const summary = buildSummaryFromDetail(eventId, detail)
    return mapAutoMtToSeismicEvent(summary, detail)
  } catch (error) {
    // Fallback to mock data
    console.warn('Failed to fetch event detail from API, using mock data:', error)
    const { mockEvents } = await import('@/lib/mock/events')
    const event = mockEvents.find((e) => e.id === eventId)
    if (!event) {
      throw new Error(`Event not found: ${eventId}`)
    }
    return event
  }
}

async function fetchEvents(filter: EventFilter): Promise<PagedEventsResult> {
  const { settings } = useSettingsStore.getState()
  const listUrl = resolveEventsEndpoint(settings.server.fdsnEventUrl)

  try {
    const query = buildAutoMtQuery(filter)
    listUrl.search = ''
    listUrl.searchParams.set('page', `${query.page}`)
    listUrl.searchParams.set('page_size', `${query.page_size}`)
    if (query.method_id) listUrl.searchParams.set('method_id', query.method_id)
    if (query.focal_mechanism_quality) {
      listUrl.searchParams.set('focal_mechanism_quality', query.focal_mechanism_quality)
    }

    const listResponse = await fetch(listUrl.toString(), {
      headers: { accept: 'application/json' },
    })
    if (!listResponse.ok) throw new Error(`AutoMT list error: ${listResponse.status}`)

    const listJson = (await listResponse.json()) as AutoMtEventListResponse | unknown
    const listItems = extractAutoMtEvents(listJson)
    if (listItems.length === 0) {
      throw new Error('AutoMT list response has no events array')
    }

    const mapped = listItems.map((item) => mapAutoMtToSeismicEvent(item))
    const events = applyUiFilters(mapped, filter)
    const totalCount = readTotalCount(listJson)
    const hasPrevPage = query.page > 1
    const hasNextPage = totalCount !== undefined
      ? query.page * query.page_size < totalCount
      : listItems.length >= query.page_size

    return {
      events,
      page: query.page,
      pageSize: query.page_size,
      totalCount,
      hasPrevPage,
      hasNextPage,
    }
  } catch (error) {
    // Fallback to mock data when API is unavailable
    console.warn('Failed to fetch events from API, using mock data:', error)
    
    // Import mock events
    const { mockEvents } = await import('@/lib/mock/events')
    const events = applyUiFilters(mockEvents, filter)
    
    // Simple pagination for mock data
    const page = filter.page || 1
    const pageSize = filter.pageSize || 50
    const startIdx = (page - 1) * pageSize
    const endIdx = startIdx + pageSize
    const pagedEvents = events.slice(startIdx, endIdx)
    
    return {
      events: pagedEvents,
      page,
      pageSize,
      totalCount: events.length,
      hasPrevPage: page > 1,
      hasNextPage: endIdx < events.length,
    }
  }
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
  // Event catalog
  getEvents: fetchEvents,
  getEventById: fetchEventById,
  getWaveform: fetchWaveform,
  openFile: openFileWeb,
  saveFile: saveFileWeb,

  // Job management (AutoMT)
  createInteractiveJob: async (request) => {
    const client = getAutoMTClient()
    return client.createInteractiveJob(request)
  },
  getJob: async (jobId) => {
    const client = getAutoMTClient()
    return client.getJob(jobId)
  },
  getJobProgress: async (jobId) => {
    const client = getAutoMTClient()
    return client.getJobProgress(jobId)
  },
  deleteJob: async (jobId) => {
    const client = getAutoMTClient()
    return client.deleteJob(jobId)
  },

  // Stage execution
  runStationPrep: async (jobId) => {
    const client = getAutoMTClient()
    return client.runStationPrep(jobId)
  },
  runWaveformPrep: async (jobId) => {
    const client = getAutoMTClient()
    return client.runWaveformPrep(jobId)
  },
  runStationSelection: async (jobId, request) => {
    const client = getAutoMTClient()
    return client.runStationSelection(jobId, request)
  },
  runInversion: async (jobId, request) => {
    const client = getAutoMTClient()
    return client.runInversion(jobId, request)
  },
  runFinalize: async (jobId) => {
    const client = getAutoMTClient()
    return client.runFinalize(jobId)
  },

  // Station management
  getJobStations: async (jobId) => {
    const client = getAutoMTClient()
    return client.getJobStations(jobId)
  },
  patchStations: async (jobId, request) => {
    const client = getAutoMTClient()
    return client.patchStations(jobId, request)
  },
  toggleStationSelection: async (jobId, stationId) => {
    const client = getAutoMTClient()
    return client.toggleStationSelection(jobId, stationId)
  },
  applyStationTimeShift: async (jobId, stationId, timeShift) => {
    const client = getAutoMTClient()
    return client.applyStationTimeShift(jobId, stationId, { time_shift_s: timeShift })
  },

  // Waveform data
  getJobWaveforms: async (jobId, kind, stationId) => {
    const client = getAutoMTClient()
    return client.getJobWaveforms(jobId, { kind, station_id: stationId })
  },

  // Solutions & results
  getJobSolutions: async (jobId, stage) => {
    const client = getAutoMTClient()
    return client.getJobSolutions(jobId, { stage })
  },
  getJobResults: async (jobId) => {
    const client = getAutoMTClient()
    return client.getJobResults(jobId)
  },
  downloadJobResultFile: async (jobId, filename) => {
    const client = getAutoMTClient()
    return client.downloadJobResultFile(jobId, filename)
  },

  // Parameter adjustments
  patchFrequency: async (jobId, fmin, fmax) => {
    const client = getAutoMTClient()
    return client.patchFrequency(jobId, { fmin, fmax })
  },
  patchDistanceBounds: async (jobId, minDist, maxDist) => {
    const client = getAutoMTClient()
    return client.patchDistanceBounds(jobId, { min_dist: minDist, max_dist: maxDist })
  },

  // Checkpoints
  listCheckpoints: async (jobId) => {
    const client = getAutoMTClient()
    return client.listCheckpoints(jobId)
  },
  restoreCheckpoint: async (jobId, checkpointId) => {
    const client = getAutoMTClient()
    return client.restoreCheckpoint(jobId, checkpointId)
  },

  // Patch history
  getPatchHistory: async (jobId) => {
    const client = getAutoMTClient()
    return client.getPatchHistory(jobId)
  },

  // Task polling
  pollTaskStatus: async (taskId) => {
    const client = getAutoMTClient()
    const result = await client.pollTaskStatus(taskId)
    return {
      status: result.status,
      message: result.message,
      error: result.error,
    }
  },
  cancelTask: async (taskId) => {
    const client = getAutoMTClient()
    return client.cancelTask(taskId)
  },

  // SSE stream URLs
  getTaskLogStreamUrl: (taskId) => {
    const client = getAutoMTClient()
    return client.getTaskLogStreamUrl(taskId)
  },
  getTaskResultStreamUrl: (taskId) => {
    const client = getAutoMTClient()
    return client.getTaskResultStreamUrl(taskId)
  },
}

// ─── Electron implementation (stub — filled in Phase 2) ──────────────────────

declare global {
  interface Window {
    electronAPI?: PlatformAPI
  }
}

export const electronPlatform: PlatformAPI = {
  // Event catalog
  getEvents: (filter) => window.electronAPI!.getEvents(filter),
  getEventById: (eventId) => window.electronAPI!.getEventById(eventId),
  getWaveform: (params) => window.electronAPI!.getWaveform(params),
  openFile: (opts) => window.electronAPI!.openFile(opts),
  saveFile: async (data, filename) => window.electronAPI!.saveFile(data, filename),

  // Job management (stub for Phase 2)
  createInteractiveJob: (request) => window.electronAPI!.createInteractiveJob(request),
  getJob: (jobId) => window.electronAPI!.getJob(jobId),
  getJobProgress: (jobId) => window.electronAPI!.getJobProgress(jobId),
  deleteJob: (jobId) => window.electronAPI!.deleteJob(jobId),

  // Stage execution
  runStationPrep: (jobId) => window.electronAPI!.runStationPrep(jobId),
  runWaveformPrep: (jobId) => window.electronAPI!.runWaveformPrep(jobId),
  runStationSelection: (jobId, request) => window.electronAPI!.runStationSelection(jobId, request),
  runInversion: (jobId, request) => window.electronAPI!.runInversion(jobId, request),
  runFinalize: (jobId) => window.electronAPI!.runFinalize(jobId),

  // Station management
  getJobStations: (jobId) => window.electronAPI!.getJobStations(jobId),
  patchStations: (jobId, request) => window.electronAPI!.patchStations(jobId, request),
  toggleStationSelection: (jobId, stationId) => window.electronAPI!.toggleStationSelection(jobId, stationId),
  applyStationTimeShift: (jobId, stationId, timeShift) => window.electronAPI!.applyStationTimeShift(jobId, stationId, timeShift),

  // Waveform data
  getJobWaveforms: (jobId, kind, stationId) => window.electronAPI!.getJobWaveforms(jobId, kind, stationId),

  // Solutions & results
  getJobSolutions: (jobId, stage) => window.electronAPI!.getJobSolutions(jobId, stage),
  getJobResults: (jobId) => window.electronAPI!.getJobResults(jobId),
  downloadJobResultFile: (jobId, filename) => window.electronAPI!.downloadJobResultFile(jobId, filename),

  // Parameter adjustments
  patchFrequency: (jobId, fmin, fmax) => window.electronAPI!.patchFrequency(jobId, fmin, fmax),
  patchDistanceBounds: (jobId, minDist, maxDist) => window.electronAPI!.patchDistanceBounds(jobId, minDist, maxDist),

  // Checkpoints
  listCheckpoints: (jobId) => window.electronAPI!.listCheckpoints(jobId),
  restoreCheckpoint: (jobId, checkpointId) => window.electronAPI!.restoreCheckpoint(jobId, checkpointId),

  // Patch history
  getPatchHistory: (jobId) => window.electronAPI!.getPatchHistory(jobId),

  // Task polling
  pollTaskStatus: (taskId) => window.electronAPI!.pollTaskStatus(taskId),
  cancelTask: (taskId) => window.electronAPI!.cancelTask(taskId),

  // SSE stream URLs
  getTaskLogStreamUrl: (taskId) => window.electronAPI!.getTaskLogStreamUrl(taskId),
  getTaskResultStreamUrl: (taskId) => window.electronAPI!.getTaskResultStreamUrl(taskId),
}

// ─── Auto-detect & export ─────────────────────────────────────────────────────

export const platform: PlatformAPI =
  typeof window !== 'undefined' && window.electronAPI !== undefined
    ? electronPlatform
    : webPlatform
