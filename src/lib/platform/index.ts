import type { SeismicEvent } from '@/types/seismology'
import type { EventFilter } from '@/stores/eventStore'
import type { ProcessingContext, MomentTensorSolution } from '@/types/waveform'
import type { NodalPlanes } from '@/types/seismology'
import { useSettingsStore } from '@/stores/settingsStore'

// ─── Platform API interface ────────────────────────────────────────────────────

export interface PlatformAPI {
  getEvents: (filter: EventFilter) => Promise<SeismicEvent[]>
  getEventById: (eventId: string) => Promise<SeismicEvent>
  getWaveform: (params: WaveformRequest) => Promise<ArrayBuffer>
  openFile: (options?: { accept?: string }) => Promise<string | null>
  saveFile: (data: Blob, filename: string) => Promise<boolean>
  
  // Waveform Interactive Processing (AutoMT API)
  initializeInteractiveJob: (request: InteractiveJobInitRequest) => Promise<InteractiveJobInitResponse>
  startStationPreparation: (jobId: string) => Promise<InteractiveJobInitResponse>
  startWaveformPreparation: (jobId: string) => Promise<InteractiveJobInitResponse>
  startStationSelection: (jobId: string, request?: StationSelectionRequest) => Promise<InteractiveJobInitResponse>
  startInversion: (jobId: string, request?: InversionRequest) => Promise<InteractiveJobInitResponse>
  getInteractiveTaskStatus: (taskId: string) => Promise<InteractiveTaskStatus>
  getInteractiveTaskStreamLogsUrl: (taskIdOrJobId: string) => string
  getJobProgress: (jobId: string) => Promise<JobProgressSnapshot>
  getJobContext: (jobId: string) => Promise<ProcessingContext>
  getJobSolutions: (jobId: string) => Promise<JobSolutionsResponse>
  getJobResults: (jobId: string) => Promise<JobResultsResponse>
  getJobGreenFunctions: (jobId: string, options?: JobGreenFunctionsRequest) => Promise<JobGreenFunctionsResponse>
  updateStationWeights: (jobId: string, weights: Record<string, number>) => Promise<void>
  toggleStationActive: (jobId: string, stationKey: string, active: boolean) => Promise<void>
  updateFrequencyFilter: (jobId: string, fmin: number, fmax: number) => Promise<MomentTensorSolution>
  runDepthSearch: (jobId: string, params: DepthSearchParams) => Promise<MomentTensorSolution>
  optimizeInversion: (jobId: string) => Promise<MomentTensorSolution>
  commitSolution: (jobId: string) => Promise<void>
}

export interface WaveformRequest {
  network: string
  station: string
  location: string
  channel: string
  startTime: Date
  endTime: Date
}

export interface DepthSearchParams {
  min_depth_km: number
  max_depth_km: number
  step_km: number
  use_1d_grid?: boolean
}

export interface InteractiveJobInitRequest {
  event_id: string
  lat: number
  lon: number
  mag: number
  depth: number
  time: string
  waveform_source_type?: 'seiscomp' | 'fdsn' | 'archive'
  auto_gf?: boolean
  is_deviatoric?: boolean
  data_is_corrected?: boolean
  target_method?: string
  override_fband?: [number, number]
  centroid_inversion?: boolean
}

export interface InteractiveJobInitResponse {
  job_id: string
  task_id?: string
  stage?: string
  status?: string
  poll_url?: string
  stream_url?: string
  result_stream_url?: string
}

export interface InteractiveTaskStatus {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout'
  stage?: string
  progress?: number
  error?: string
  detail?: string
}

export interface InversionRequest {
  is_automatic: boolean
  est_uncertainty: boolean
  use_optimization: boolean
  force_optimization: boolean
}

export interface StationSelectionRequest {
  use_all_stations: boolean
  num_sector: number
  num_station_per_sector: number
}

const DEFAULT_STATION_SELECTION_REQUEST: StationSelectionRequest = {
  use_all_stations: false,
  num_sector: 12,
  num_station_per_sector: 2,
}

const DEFAULT_INVERSION_REQUEST: InversionRequest = {
  is_automatic: true,
  est_uncertainty: false,
  use_optimization: false,
  force_optimization: false,
}

export interface JobProgressSnapshot {
  stage: string | null
  status: string | null
  progress: number
  message: string | null
  task_id: string | null
  stream_url: string | null
  latest_task_stream_url: string | null
  updated_at: string | null
}

export interface JobSolutionEntry {
  stage?: string
  depth_km?: number
  latitude?: number
  longitude?: number
  variance_reduction?: number
  dc_perc?: number
  clvd_perc?: number
  iso_perc?: number
  quality?: number
  stations_used?: number
  observation_gap?: number
  scalar_moment?: number
  magnitude_mw?: number
  moment_tensor?: {
    m11?: number
    m22?: number
    m33?: number
    m12?: number
    m13?: number
    m23?: number
  }
  tensor?: {
    mrr?: number
    mtt?: number
    mpp?: number
    mrt?: number
    mrp?: number
    mtp?: number
  }
  nodalPlanes?: NodalPlanes
  s1?: number
  d1?: number
  r1?: number
  s2?: number
  d2?: number
  r2?: number
  derived?: {
    fit_percent?: number
    avg_scale?: number
    stations_used?: number
    azimuthal_gap?: number
    dc100?: number
    clvd100?: number
  }
}

export interface JobSolutionsResponse {
  job_id: string
  solutions: JobSolutionEntry[]
}

export interface JobResultsResponse {
  job_id: string
  final_stage?: string
  final_solution?: JobSolutionEntry
}

export interface JobGreenFunctionsRequest {
  topN?: number
  primaryModel?: string
}

export interface JobGreenFunctionsResponse {
  job_id: string
  target_method?: string
  target_method_source?: string
  primary_model?: string
  top_n?: number
  auto_gf?: boolean
  selected_gf?: string | null
  green_functions: string[]
  nearest_green_functions: string[]
  configured_count?: number
  nearest_count?: number
}

interface JobProgressStageItem {
  stage?: string
  status?: string
  completed_at?: string | null
  latest_task_id?: string | null
  latest_task_stream_url?: string | null
  latest_task_status?: string | null
}

const DONE_STATUSES = new Set(['done', 'success', 'completed'])

export function isWaveformPrepDone(stage?: string | null, status?: string | null): boolean {
  if (!stage || !status) return false
  return stage.toUpperCase() === 'WAVEFORM_PREP' && DONE_STATUSES.has(status.toLowerCase())
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
  focal_mechanism_quality?: string
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

const AUTO_MT_EVENTS_URL = '/autoqcmt/v1/events'
const AUTO_MT_PROXY_BASE = '/autoqcmt'

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function normalizeAutoMtApiBasePath(pathname: string): string {
  const cleaned = stripTrailingSlash(pathname || '')
  if (!cleaned || cleaned === '/') return ''

  // Backward compatibility for legacy /automt path.
  if (cleaned === '/automt') {
    return '/autoqcmt'
  }

  if (cleaned.startsWith('/automt/')) {
    return cleaned.replace('/automt/', '/autoqcmt/')
  }

  // Accept both .../autoqcmt and .../autoqcmt/v1 as configured base URL.
  if (cleaned.endsWith('/v1')) {
    return cleaned.slice(0, -3)
  }

  return cleaned
}

function getAutoMtBaseUrlWeb(): string {
  const { settings } = useSettingsStore.getState()
  const configured = (settings.server.autoMtUrl || '').trim()
  if (!configured) return AUTO_MT_PROXY_BASE

  try {
    const parsed = new URL(configured, window.location.origin)
    const isCrossOrigin = parsed.origin !== window.location.origin
    const isMixedContent = window.location.protocol === 'https:' && parsed.protocol === 'http:'

    // In web mode, prefer same-origin proxy when target is cross-origin/mixed-content.
    if (isCrossOrigin || isMixedContent) {
      const path = normalizeAutoMtApiBasePath(parsed.pathname)
      return path || AUTO_MT_PROXY_BASE
    }

    const path = normalizeAutoMtApiBasePath(parsed.pathname)
    return `${parsed.origin}${path}`
  } catch {
    return AUTO_MT_PROXY_BASE
  }
}

function normalizeAutoMtUrl(urlOrPath: string): string {
  if (!urlOrPath) return urlOrPath

  try {
    const parsed = new URL(urlOrPath, window.location.origin)
    if (parsed.pathname.startsWith('/autoqcmt/')) {
      return `${parsed.pathname}${parsed.search}`
    }
    if (parsed.pathname.startsWith('/automt/')) {
      return `${parsed.pathname}${parsed.search}`
    }
    return parsed.toString()
  } catch {
    return urlOrPath
  }
}

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

  const parseStationId = (stationId?: string): { networkCode: string; stationCode: string; locationCode?: string; channelCode?: string } => {
    if (!stationId) return { networkCode: '', stationCode: '' }
    const parts = stationId.split('.')
    if (parts.length >= 4) {
      return {
        networkCode: parts[0] ?? '',
        stationCode: parts[1] ?? '',
        locationCode: parts[2] ?? '',
        channelCode: parts[3] ?? '',
      }
    }
    if (parts.length >= 2) {
      return {
        networkCode: parts[0] ?? '',
        stationCode: parts[1] ?? '',
      }
    }
    return { networkCode: '', stationCode: stationId }
  }

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
                      ...parseStationId(station.station_id),
                      waveformId: {
                        networkCode: parseStationId(station.station_id).networkCode,
                        stationCode: parseStationId(station.station_id).stationCode,
                        locationCode: parseStationId(station.station_id).locationCode,
                        channelCode: parseStationId(station.station_id).channelCode || comp.component || '',
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

function extractAutoMtEventDetail(payload: unknown): AutoMtEventDetail {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  const obj = payload as {
    data?: unknown
    item?: unknown
    result?: unknown
    details?: unknown
  }

  if (obj.data && typeof obj.data === 'object') return obj.data as AutoMtEventDetail
  if (obj.item && typeof obj.item === 'object') return obj.item as AutoMtEventDetail
  if (obj.result && typeof obj.result === 'object') return obj.result as AutoMtEventDetail
  if (obj.details && typeof obj.details === 'object') return obj.details as AutoMtEventDetail

  return payload as AutoMtEventDetail
}

async function fetchEvents(filter: EventFilter): Promise<SeismicEvent[]> {
  const baseUrl = getAutoMtBaseUrlWeb()
  const listUrl = new URL(`${baseUrl}/v1/events`, window.location.origin)

  const page = Number.isFinite(filter.page) ? Math.max(1, Math.trunc(filter.page)) : 1
  const pageSize = Number.isFinite(filter.pageSize) ? Math.max(1, Math.min(100, Math.trunc(filter.pageSize))) : 20
  const methodId = filter.methodId.trim()
  const focalMechanismQuality = filter.focalMechanismQuality.trim()

  listUrl.searchParams.set('page', String(page))
  listUrl.searchParams.set('page_size', String(pageSize))

  if (methodId) {
    listUrl.searchParams.set('method_id', methodId)
  }

  if (focalMechanismQuality) {
    listUrl.searchParams.set('focal_mechanism_quality', focalMechanismQuality)
  }

  if (filter.dateFrom) {
    listUrl.searchParams.set('start_time', filter.dateFrom.toISOString())
  }

  if (filter.dateTo) {
    listUrl.searchParams.set('end_time', filter.dateTo.toISOString())
  }

  const listResponse = await fetch(normalizeAutoMtUrl(listUrl.toString()), {
    headers: { accept: 'application/json' },
  })
  if (!listResponse.ok) throw new Error(`AutoMT list error: ${listResponse.status}`)

  const listJson = (await listResponse.json()) as AutoMtEventListResponse | unknown
  const listItems = extractAutoMtEvents(listJson)
  return listItems.map((item) => mapAutoMtToSeismicEvent(item))
}

async function fetchEventById(eventId: string): Promise<SeismicEvent> {
  const baseUrl = getAutoMtBaseUrlWeb()
  const detailUrl = new URL(`${baseUrl}/v1/events/${encodeURIComponent(eventId)}`, window.location.origin)

  const detailResponse = await fetch(normalizeAutoMtUrl(detailUrl.toString()), {
    headers: { accept: 'application/json' },
  })
  if (!detailResponse.ok) {
    throw new Error(`AutoMT detail error: ${detailResponse.status}`)
  }

  const detailJson = await detailResponse.json()
  const detail = extractAutoMtEventDetail(detailJson)

  const summary: AutoMtEventListItem = {
    event_id: eventId,
    origin_time: detail.centroid?.time ?? new Date().toISOString(),
    latitude: detail.centroid?.latitude ?? 0,
    longitude: detail.centroid?.longitude ?? 0,
    depth_km: detail.centroid?.depth_km ?? 0,
    magnitude: detail.magnitude?.magnitude ?? 0,
    magnitude_type: detail.magnitude?.type ?? 'M',
    phases: detail.centroid?.used_station_count,
    evaluation_status: detail.focal_mechanism?.evaluation_status,
    focal_mechanism_count: detail.focal_mechanism ? 1 : 0,
  }

  return mapAutoMtToSeismicEvent(summary, detail)
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

// ─── Waveform Interactive Processing (AutoMT API) ────────────────────────────

function extractProcessingContext(payload: unknown): ProcessingContext {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid processing context payload')
  }

  const obj = payload as Record<string, unknown>
  const nested = obj.context && typeof obj.context === 'object'
    ? (obj.context as Record<string, unknown>)
    : obj

  return {
    job_id: (obj.job_id as string) ?? (nested.job_id as string) ?? '',
    event_id: (obj.event_id as string) ?? (nested.event_id as string) ?? '',
    current_stage: ((obj.current_stage as string) ?? (nested.current_stage as string) ?? 'INIT') as ProcessingContext['current_stage'],
    event: (nested.event as ProcessingContext['event']) ?? {
      lat: 0,
      lon: 0,
      depth_km: 0,
      mag: 0,
      origin_time: new Date().toISOString(),
    },
    params: (nested.params as ProcessingContext['params']) ?? {
      inversion_method: 'QCMT_R',
      fmin: 0.02,
      fmax: 0.08,
      min_dist: 0.5,
      max_dist: 7.5,
      deviatoric: true,
      use_gpu: false,
      centroid_inversion: false,
      dc_interest_eq: true,
    },
    valid_waveforms: (nested.valid_waveforms as ProcessingContext['valid_waveforms']) ?? {},
    selected_stations: (nested.selected_stations as string[]) ?? [],
    best_solution: nested.best_solution as ProcessingContext['best_solution'],
  }
}

async function initializeInteractiveJobWeb(
  request: InteractiveJobInitRequest
): Promise<InteractiveJobInitResponse> {
  const baseUrl = getAutoMtBaseUrlWeb()

  const response = await fetch(`${baseUrl}/v1/interactive-processor/jobs?debug=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Failed to initialize interactive job: ${response.status} ${response.statusText}`)
  }

  const payload = (await response.json()) as InteractiveJobInitResponse
  if (!payload.job_id) {
    throw new Error('Interactive job response missing job_id')
  }
  return payload
}

async function startStationPreparationWeb(jobId: string): Promise<InteractiveJobInitResponse> {
  const baseUrl = getAutoMtBaseUrlWeb()

  const response = await fetch(`${baseUrl}/v1/interactive-processor/jobs/${encodeURIComponent(jobId)}/station-prep?debug=false`, {
    method: 'POST',
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to start station preparation: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function startWaveformPreparationWeb(jobId: string): Promise<InteractiveJobInitResponse> {
  const baseUrl = getAutoMtBaseUrlWeb()

  const response = await fetch(`${baseUrl}/v1/interactive-processor/jobs/${encodeURIComponent(jobId)}/waveform-prep?debug=false`, {
    method: 'POST',
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to start waveform preparation: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function startInversionWeb(
  jobId: string,
  request: InversionRequest = DEFAULT_INVERSION_REQUEST
): Promise<InteractiveJobInitResponse> {
  const baseUrl = getAutoMtBaseUrlWeb()

  const response = await fetch(
    `${baseUrl}/v1/interactive-processor/jobs/${encodeURIComponent(jobId)}/inversion?dry_run=false&debug=false`,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to start inversion: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function startStationSelectionWeb(
  jobId: string,
  request: StationSelectionRequest = DEFAULT_STATION_SELECTION_REQUEST
): Promise<InteractiveJobInitResponse> {
  const baseUrl = getAutoMtBaseUrlWeb()

  const response = await fetch(
    `${baseUrl}/v1/interactive-processor/jobs/${encodeURIComponent(jobId)}/station-selection?dry_run=false&debug=false`,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to start station selection: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function fetchInteractiveTaskStatusWeb(taskId: string): Promise<InteractiveTaskStatus> {
  const baseUrl = getAutoMtBaseUrlWeb()

  const response = await fetch(`${baseUrl}/v1/interactive-processor/tasks/${encodeURIComponent(taskId)}?include_logs=false`, {
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch task status: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json() as Record<string, unknown>
  return {
    task_id: (payload.task_id as string) ?? taskId,
    status: ((payload.status as string) ?? 'running') as InteractiveTaskStatus['status'],
    stage: payload.stage as string | undefined,
    progress: typeof payload.progress === 'number' ? payload.progress : undefined,
    error: payload.error as string | undefined,
    detail: payload.detail as string | undefined,
  }
}

function buildInteractiveTaskStreamLogsUrlWeb(taskIdOrJobId: string): string {
  const baseUrl = getAutoMtBaseUrlWeb()
  return normalizeAutoMtUrl(`${baseUrl}/v1/interactive-processor/tasks/${encodeURIComponent(taskIdOrJobId)}/streamlogs`)
}

function normalizeJobProgressPayload(payload: unknown): JobProgressSnapshot {
  const obj = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>
  const stages = Array.isArray(obj.stages) ? (obj.stages as JobProgressStageItem[]) : []
  const waveformPrepStage = stages.find((item) => item.stage?.toUpperCase() === 'WAVEFORM_PREP')

  const derivedProgress =
    stages.length > 0
      ? (stages.filter((item) => item.status?.toLowerCase() === 'done').length / stages.length) * 100
      : 0

  const topLevelStage = typeof obj.stage === 'string'
    ? obj.stage
    : typeof obj.current_stage === 'string'
      ? obj.current_stage
      : null

  const topLevelStatus = typeof obj.status === 'string' ? obj.status : null

  const stage = waveformPrepStage?.stage ?? topLevelStage
  const status =
    waveformPrepStage?.status ??
    topLevelStatus ??
    (waveformPrepStage?.latest_task_status === 'completed' ? 'done' : null)

  const progress = typeof obj.progress_pct === 'number'
    ? obj.progress_pct
    : typeof obj.progress === 'number'
      ? obj.progress
      : derivedProgress

  const latestTaskStreamUrlFromStage = waveformPrepStage?.latest_task_stream_url ?? null
  const latestTaskIdFromStage = waveformPrepStage?.latest_task_id ?? null
  const updatedAt =
    waveformPrepStage?.completed_at ??
    (typeof obj.updated_at === 'string' ? obj.updated_at : new Date().toISOString())

  const message =
    typeof obj.message === 'string'
      ? obj.message
      : stage && status
        ? `${stage} is ${status}`
        : null

  return {
    stage,
    status,
    progress,
    message,
    task_id: latestTaskIdFromStage ?? (typeof obj.task_id === 'string' ? obj.task_id : null),
    stream_url:
      latestTaskStreamUrlFromStage ??
      (typeof obj.stream_url === 'string' ? obj.stream_url : null),
    latest_task_stream_url:
      latestTaskStreamUrlFromStage ??
      (typeof obj.latest_task_stream_url === 'string' ? obj.latest_task_stream_url : null),
    updated_at: updatedAt,
  }
}

async function fetchJobProgressWeb(jobId: string): Promise<JobProgressSnapshot> {
  const baseUrl = getAutoMtBaseUrlWeb()
  const response = await fetch(`${baseUrl}/v1/interactive-processor/jobs/${encodeURIComponent(jobId)}/progress`, {
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch job progress: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  return normalizeJobProgressPayload(payload)
}

async function fetchJobContext(jobId: string): Promise<ProcessingContext> {
  const baseUrl = getAutoMtBaseUrlWeb()
  
  const response = await fetch(`${baseUrl}/v1/interactive-processor/jobs/${jobId}/context`)
  if (!response.ok) {
    throw new Error(`Failed to fetch job context: ${response.status} ${response.statusText}`)
  }
  
  const payload = await response.json()
  return extractProcessingContext(payload)
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) return undefined
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function toRealQuantity(value: unknown): { value: number } | undefined {
  const numberValue = toNumberOrUndefined(value)
  return numberValue != null ? { value: numberValue } : undefined
}

function extractSdrFields(item: Record<string, unknown>): {
  s1?: number
  d1?: number
  r1?: number
  s2?: number
  d2?: number
  r2?: number
} {
  const candidates: Array<Record<string, unknown>> = [item]

  const nodalPlanesSnake = item.nodal_planes
  if (nodalPlanesSnake && typeof nodalPlanesSnake === 'object' && !Array.isArray(nodalPlanesSnake)) {
    candidates.push(nodalPlanesSnake as Record<string, unknown>)
  }

  const nodalPlanesCamel = item.nodalPlanes
  if (nodalPlanesCamel && typeof nodalPlanesCamel === 'object' && !Array.isArray(nodalPlanesCamel)) {
    candidates.push(nodalPlanesCamel as Record<string, unknown>)
  }

  const nodalPlaneObj = item.nodal_plane
  if (nodalPlaneObj && typeof nodalPlaneObj === 'object' && !Array.isArray(nodalPlaneObj)) {
    candidates.push(nodalPlaneObj as Record<string, unknown>)
  }

  const decomposition = item.decomposition
  if (decomposition && typeof decomposition === 'object' && !Array.isArray(decomposition)) {
    candidates.push(decomposition as Record<string, unknown>)
  }

  const focalMech = item.focal_mechanism
  if (focalMech && typeof focalMech === 'object' && !Array.isArray(focalMech)) {
    const fm = focalMech as Record<string, unknown>
    candidates.push(fm)
    if (fm.nodal_planes && typeof fm.nodal_planes === 'object' && !Array.isArray(fm.nodal_planes)) {
      candidates.push(fm.nodal_planes as Record<string, unknown>)
    }
  }

  for (const source of candidates) {
    const s1 = toNumberOrUndefined(source.s1)
    const d1 = toNumberOrUndefined(source.d1)
    const r1 = toNumberOrUndefined(source.r1)
    const s2 = toNumberOrUndefined(source.s2)
    const d2 = toNumberOrUndefined(source.d2)
    const r2 = toNumberOrUndefined(source.r2)
    if (s1 != null || d1 != null || r1 != null || s2 != null || d2 != null || r2 != null) {
      return { s1, d1, r1, s2, d2, r2 }
    }

    const faultplanes = source.faultplanes
    if (Array.isArray(faultplanes) && faultplanes.length >= 2) {
      const fp1 = Array.isArray(faultplanes[0]) ? faultplanes[0] : []
      const fp2 = Array.isArray(faultplanes[1]) ? faultplanes[1] : []
      const fs1 = toNumberOrUndefined(fp1[0])
      const fd1 = toNumberOrUndefined(fp1[1])
      const fr1 = toNumberOrUndefined(fp1[2])
      const fs2 = toNumberOrUndefined(fp2[0])
      const fd2 = toNumberOrUndefined(fp2[1])
      const fr2 = toNumberOrUndefined(fp2[2])

      if (fs1 != null || fd1 != null || fr1 != null || fs2 != null || fd2 != null || fr2 != null) {
        return { s1: fs1, d1: fd1, r1: fr1, s2: fs2, d2: fd2, r2: fr2 }
      }
    }
  }

  return {}
}

function extractJobSolutionNodalPlanes(item: Record<string, unknown>): JobSolutionEntry['nodalPlanes'] {
  const rawNodalPlanes = item.nodal_planes && typeof item.nodal_planes === 'object'
    ? (item.nodal_planes as Record<string, unknown>)
    : null

  const plane1FromArray = Array.isArray(item.nodal_planes) ? item.nodal_planes[0] : null
  const plane2FromArray = Array.isArray(item.nodal_planes) ? item.nodal_planes[1] : null

  const plane1 = plane1FromArray && typeof plane1FromArray === 'object'
    ? (plane1FromArray as Record<string, unknown>)
    : rawNodalPlanes?.nodalPlane1 && typeof rawNodalPlanes.nodalPlane1 === 'object'
      ? (rawNodalPlanes.nodalPlane1 as Record<string, unknown>)
      : null

  const plane2 = plane2FromArray && typeof plane2FromArray === 'object'
    ? (plane2FromArray as Record<string, unknown>)
    : rawNodalPlanes?.nodalPlane2 && typeof rawNodalPlanes.nodalPlane2 === 'object'
      ? (rawNodalPlanes.nodalPlane2 as Record<string, unknown>)
      : null

  const { s1: directS1, d1: directD1, r1: directR1, s2: directS2, d2: directD2, r2: directR2 } = extractSdrFields(item)

  const buildPlane = (source: Record<string, unknown> | null) => {
    if (!source) return undefined
    const strike = toRealQuantity(source.strike)
    const dip = toRealQuantity(source.dip)
    const rake = toRealQuantity(source.rake)
    if (!strike || !dip || !rake) return undefined
    return { strike, dip, rake }
  }

  if (directS1 != null || directD1 != null || directR1 != null || directS2 != null || directD2 != null || directR2 != null) {
    return {
      nodalPlane1: {
        strike: { value: directS1 ?? 0 },
        dip: { value: directD1 ?? 0 },
        rake: { value: directR1 ?? 0 },
      },
      nodalPlane2: {
        strike: { value: directS2 ?? 0 },
        dip: { value: directD2 ?? 0 },
        rake: { value: directR2 ?? 0 },
      },
      preferredPlane: 1,
    }
  }

  if (plane1 || plane2) {
    return {
      nodalPlane1: buildPlane(plane1),
      nodalPlane2: buildPlane(plane2),
      preferredPlane: typeof rawNodalPlanes?.preferredPlane === 'number'
        ? (rawNodalPlanes.preferredPlane as 1 | 2)
        : 1,
    }
  }

  return undefined
}

function extractJobSolutions(payload: unknown, jobId: string): JobSolutionsResponse {
  const obj = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>
  const resultObj = obj.result && typeof obj.result === 'object'
    ? (obj.result as Record<string, unknown>)
    : null
  const resultsObj = obj.results && typeof obj.results === 'object'
    ? (obj.results as Record<string, unknown>)
    : null
  const dataObj = obj.data && typeof obj.data === 'object'
    ? (obj.data as Record<string, unknown>)
    : null
  const rawSolutions = Array.isArray(obj.solutions)
    ? obj.solutions
    : Array.isArray(resultObj?.solutions)
      ? (resultObj?.solutions as unknown[])
      : Array.isArray(resultsObj?.solutions)
        ? (resultsObj?.solutions as unknown[])
        : Array.isArray(dataObj?.solutions)
          ? (dataObj?.solutions as unknown[])
    : obj.solutions && typeof obj.solutions === 'object'
      ? Object.values(obj.solutions as Record<string, unknown>)
      : resultObj?.solutions && typeof resultObj.solutions === 'object'
        ? Object.values(resultObj.solutions as Record<string, unknown>)
        : resultsObj?.solutions && typeof resultsObj.solutions === 'object'
          ? Object.values(resultsObj.solutions as Record<string, unknown>)
          : dataObj?.solutions && typeof dataObj.solutions === 'object'
            ? Object.values(dataObj.solutions as Record<string, unknown>)
      : []

  const countsCandidate = obj.counts ?? resultObj?.counts ?? resultsObj?.counts ?? dataObj?.counts
  const countsObj = countsCandidate && typeof countsCandidate === 'object'
    ? (countsCandidate as Record<string, unknown>)
    : null
  const rootObservationGap =
    toNumberOrUndefined(obj.observation_gap) ??
    toNumberOrUndefined(resultObj?.observation_gap) ??
    toNumberOrUndefined(resultsObj?.observation_gap) ??
    toNumberOrUndefined(dataObj?.observation_gap)

  const solutions: JobSolutionEntry[] = rawSolutions
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const itemCountsObj = item.counts && typeof item.counts === 'object'
        ? (item.counts as Record<string, unknown>)
        : null
      const selectedStations =
        toNumberOrUndefined(itemCountsObj?.selected_stations) ??
        toNumberOrUndefined(countsObj?.selected_stations) ??
        toNumberOrUndefined(item.stations_used)
      const observationGap = toNumberOrUndefined(item.observation_gap) ?? rootObservationGap

      const sdr = extractSdrFields(item)
      const decomposition = item.decomposition && typeof item.decomposition === 'object'
        ? (item.decomposition as Record<string, unknown>)
        : null
      const rawTensor = (item.tensor && typeof item.tensor === 'object'
        ? item.tensor
        : null) as Record<string, unknown> | null
      const rawMomentTensor = (item.moment_tensor && typeof item.moment_tensor === 'object'
        ? item.moment_tensor
        : null) as Record<string, unknown> | null

      const momentTensor = rawMomentTensor
        ? {
            m11: toNumberOrUndefined(rawMomentTensor.m11),
            m22: toNumberOrUndefined(rawMomentTensor.m22),
            m33: toNumberOrUndefined(rawMomentTensor.m33),
            m12: toNumberOrUndefined(rawMomentTensor.m12),
            m13: toNumberOrUndefined(rawMomentTensor.m13),
            m23: toNumberOrUndefined(rawMomentTensor.m23),
          }
        : undefined

      const tensorFromTensor = rawTensor
        ? {
            mrr: typeof rawTensor.mrr === 'number' ? rawTensor.mrr : undefined,
            mtt: typeof rawTensor.mtt === 'number' ? rawTensor.mtt : undefined,
            mpp: typeof rawTensor.mpp === 'number' ? rawTensor.mpp : undefined,
            mrt: typeof rawTensor.mrt === 'number' ? rawTensor.mrt : undefined,
            mrp: typeof rawTensor.mrp === 'number' ? rawTensor.mrp : undefined,
            mtp: typeof rawTensor.mtp === 'number' ? rawTensor.mtp : undefined,
          }
        : undefined

      const tensorFromMoment = momentTensor
        ? {
            mrr: momentTensor.m11,
            mtt: momentTensor.m22,
            mpp: momentTensor.m33,
            mrt: momentTensor.m12,
            mrp: momentTensor.m13,
            mtp: momentTensor.m23,
          }
        : undefined

      return {
        depth_km: toNumberOrUndefined(item.depth_km),
        latitude: toNumberOrUndefined(item.latitude),
        longitude: toNumberOrUndefined(item.longitude),
        variance_reduction: toNumberOrUndefined(item.variance_reduction),
        dc_perc: toNumberOrUndefined(item.dc_perc) ?? toNumberOrUndefined(decomposition?.dc_perc),
        clvd_perc: toNumberOrUndefined(item.clvd_perc) ?? toNumberOrUndefined(decomposition?.clvd_perc),
        iso_perc: toNumberOrUndefined(item.iso_perc) ?? toNumberOrUndefined(decomposition?.iso_perc),
        quality: toNumberOrUndefined(item.quality),
        stations_used: selectedStations,
        observation_gap: observationGap,
        scalar_moment: toNumberOrUndefined(item.scalar_moment) ?? toNumberOrUndefined(decomposition?.moment),
        magnitude_mw: toNumberOrUndefined(item.magnitude_mw) ?? toNumberOrUndefined(decomposition?.Mw),
        tensor: tensorFromTensor ?? tensorFromMoment,
        moment_tensor: momentTensor ?? undefined,
        nodalPlanes: extractJobSolutionNodalPlanes(item) ?? undefined,
        s1: sdr.s1,
        d1: sdr.d1,
        r1: sdr.r1,
        s2: sdr.s2,
        d2: sdr.d2,
        r2: sdr.r2,
        derived: {
          fit_percent: toNumberOrUndefined(item.variance_reduction) != null
            ? (toNumberOrUndefined(item.variance_reduction) as number) * 100
            : undefined,
          avg_scale: toNumberOrUndefined(item.condition_number),
          stations_used: selectedStations,
          azimuthal_gap: observationGap,
          dc100: toNumberOrUndefined(decomposition?.dc_perc),
          clvd100: toNumberOrUndefined(decomposition?.clvd_perc),
        },
      }
    })

  return {
    job_id: typeof obj.job_id === 'string' ? obj.job_id : jobId,
    solutions,
  }
}

async function fetchJobSolutionsWeb(jobId: string): Promise<JobSolutionsResponse> {
  const baseUrl = getAutoMtBaseUrlWeb()
  const response = await fetch(`${baseUrl}/v1/interactive-processor/jobs/${encodeURIComponent(jobId)}/solutions`, {
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch job solutions: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  return extractJobSolutions(payload, jobId)
}

function extractJobResultSolution(raw: unknown): JobSolutionEntry | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const item = raw as Record<string, unknown>
  const decomposition = item.decomposition && typeof item.decomposition === 'object'
    ? (item.decomposition as Record<string, unknown>)
    : null
  const rawMomentTensor = (item.moment_tensor && typeof item.moment_tensor === 'object'
    ? item.moment_tensor
    : null) as Record<string, unknown> | null

  const momentTensor = rawMomentTensor
    ? {
        m11: toNumberOrUndefined(rawMomentTensor.m11),
        m22: toNumberOrUndefined(rawMomentTensor.m22),
        m33: toNumberOrUndefined(rawMomentTensor.m33),
        m12: toNumberOrUndefined(rawMomentTensor.m12),
        m13: toNumberOrUndefined(rawMomentTensor.m13),
        m23: toNumberOrUndefined(rawMomentTensor.m23),
      }
    : undefined

  const tensor = momentTensor
    ? {
        mrr: momentTensor.m11,
        mtt: momentTensor.m22,
        mpp: momentTensor.m33,
        mrt: momentTensor.m12,
        mrp: momentTensor.m13,
        mtp: momentTensor.m23,
      }
    : undefined

  const sdr = extractSdrFields(item)

  const countsObj = item.counts && typeof item.counts === 'object'
    ? (item.counts as Record<string, unknown>)
    : null
  const selectedStations =
    toNumberOrUndefined(countsObj?.selected_stations) ??
    toNumberOrUndefined(item.stations_used)

  const observationGap = toNumberOrUndefined(item.observation_gap)

  const fitPercent = toNumberOrUndefined(item.variance_reduction)
  const dcPerc = toNumberOrUndefined(item.dc_perc) ?? toNumberOrUndefined(decomposition?.dc_perc)
  const clvdPerc = toNumberOrUndefined(item.clvd_perc) ?? toNumberOrUndefined(decomposition?.clvd_perc)

  return {
    stage: typeof item.stage === 'string' ? item.stage : undefined,
    depth_km: toNumberOrUndefined(item.depth_km),
    latitude: toNumberOrUndefined(item.latitude),
    longitude: toNumberOrUndefined(item.longitude),
    variance_reduction: toNumberOrUndefined(item.variance_reduction),
    dc_perc: toNumberOrUndefined(item.dc_perc) ?? toNumberOrUndefined(decomposition?.dc_perc),
    clvd_perc: toNumberOrUndefined(item.clvd_perc) ?? toNumberOrUndefined(decomposition?.clvd_perc),
    iso_perc: toNumberOrUndefined(item.iso_perc) ?? toNumberOrUndefined(decomposition?.iso_perc),
    quality: toNumberOrUndefined(item.quality),
    stations_used: selectedStations,
    observation_gap: observationGap,
    scalar_moment: toNumberOrUndefined(item.scalar_moment) ?? toNumberOrUndefined(decomposition?.moment),
    magnitude_mw: toNumberOrUndefined(item.magnitude_mw) ?? toNumberOrUndefined(decomposition?.Mw),
    tensor,
    moment_tensor: momentTensor,
    nodalPlanes: extractJobSolutionNodalPlanes(item) ?? undefined,
    s1: sdr.s1,
    d1: sdr.d1,
    r1: sdr.r1,
    s2: sdr.s2,
    d2: sdr.d2,
    r2: sdr.r2,
    derived: {
      fit_percent: fitPercent != null ? fitPercent * 100 : undefined,
      avg_scale: toNumberOrUndefined(item.condition_number),
      stations_used: selectedStations,
      azimuthal_gap: observationGap,
      dc100: dcPerc,
      clvd100: clvdPerc,
    },
  }
}

function extractJobResults(payload: unknown, jobId: string): JobResultsResponse {
  const obj = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>

  const resultObj = obj.result && typeof obj.result === 'object'
    ? (obj.result as Record<string, unknown>)
    : null
  const resultsObj = obj.results && typeof obj.results === 'object'
    ? (obj.results as Record<string, unknown>)
    : null
  const dataObj = obj.data && typeof obj.data === 'object'
    ? (obj.data as Record<string, unknown>)
    : null

  const finalSolutionRaw =
    obj.final_solution ??
    resultObj?.final_solution ??
    resultsObj?.final_solution ??
    dataObj?.final_solution ??
    null

  const finalSolutionAugmented =
    finalSolutionRaw && typeof finalSolutionRaw === 'object'
      ? {
          ...(finalSolutionRaw as Record<string, unknown>),
          counts: obj.counts ?? resultObj?.counts ?? resultsObj?.counts ?? dataObj?.counts,
          observation_gap: obj.observation_gap ?? resultObj?.observation_gap ?? resultsObj?.observation_gap ?? dataObj?.observation_gap,
        }
      : finalSolutionRaw

  return {
    job_id: typeof obj.job_id === 'string' ? obj.job_id : jobId,
    final_stage: typeof obj.final_stage === 'string' ? obj.final_stage : undefined,
    final_solution: extractJobResultSolution(finalSolutionAugmented),
  }
}

async function fetchJobResultsWeb(jobId: string): Promise<JobResultsResponse> {
  const baseUrl = getAutoMtBaseUrlWeb()
  const response = await fetch(`${baseUrl}/v1/interactive-processor/jobs/${encodeURIComponent(jobId)}/results`, {
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch job results: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  return extractJobResults(payload, jobId)
}

function extractJobGreenFunctions(payload: unknown, jobId: string): JobGreenFunctionsResponse {
  const obj = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>
  const toStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

  return {
    job_id: typeof obj.job_id === 'string' ? obj.job_id : jobId,
    target_method: typeof obj.target_method === 'string' ? obj.target_method : undefined,
    target_method_source: typeof obj.target_method_source === 'string' ? obj.target_method_source : undefined,
    primary_model: typeof obj.primary_model === 'string' ? obj.primary_model : undefined,
    top_n: toNumberOrUndefined(obj.top_n),
    auto_gf: typeof obj.auto_gf === 'boolean' ? obj.auto_gf : undefined,
    selected_gf: typeof obj.selected_gf === 'string' || obj.selected_gf === null ? (obj.selected_gf as string | null) : undefined,
    green_functions: toStringArray(obj.green_functions),
    nearest_green_functions: toStringArray(obj.nearest_green_functions),
    configured_count: toNumberOrUndefined(obj.configured_count),
    nearest_count: toNumberOrUndefined(obj.nearest_count),
  }
}

async function fetchJobGreenFunctionsWeb(
  jobId: string,
  options?: JobGreenFunctionsRequest
): Promise<JobGreenFunctionsResponse> {
  const baseUrl = getAutoMtBaseUrlWeb()
  const params = new URLSearchParams()
  if (options?.topN != null) {
    params.set('top_n', String(options.topN))
  }
  if (options?.primaryModel) {
    params.set('primary_model', options.primaryModel)
  }
  const query = params.toString()

  const response = await fetch(
    `${baseUrl}/v1/interactive-processor/jobs/${encodeURIComponent(jobId)}/green-functions${query ? `?${query}` : ''}`,
    {
      headers: { accept: 'application/json' },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch green functions: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  return extractJobGreenFunctions(payload, jobId)
}

async function updateStationWeightsWeb(
  jobId: string,
  weights: Record<string, number>
): Promise<void> {
  const baseUrl = getAutoMtBaseUrlWeb()
  
  const response = await fetch(`${baseUrl}/v1/jobs/${jobId}/station-weights`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weights }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to update station weights: ${response.status} ${response.statusText}`)
  }
}

async function toggleStationActiveWeb(
  jobId: string,
  stationKey: string,
  active: boolean
): Promise<void> {
  const baseUrl = getAutoMtBaseUrlWeb()
  
  const response = await fetch(`${baseUrl}/v1/jobs/${jobId}/stations/${stationKey}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to toggle station active state: ${response.status} ${response.statusText}`)
  }
}

async function updateFrequencyFilterWeb(
  jobId: string,
  fmin: number,
  fmax: number
): Promise<MomentTensorSolution> {
  const baseUrl = getAutoMtBaseUrlWeb()
  
  const response = await fetch(`${baseUrl}/v1/jobs/${jobId}/frequency`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmin, fmax }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to update frequency filter: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

async function runDepthSearchWeb(
  jobId: string,
  params: DepthSearchParams
): Promise<MomentTensorSolution> {
  const baseUrl = getAutoMtBaseUrlWeb()
  
  const response = await fetch(`${baseUrl}/v1/jobs/${jobId}/depth-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to run depth search: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

async function optimizeInversionWeb(jobId: string): Promise<MomentTensorSolution> {
  const baseUrl = getAutoMtBaseUrlWeb()
  
  const response = await fetch(`${baseUrl}/v1/jobs/${jobId}/optimize`, {
    method: 'POST',
  })
  
  if (!response.ok) {
    throw new Error(`Failed to optimize inversion: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

async function commitSolutionWeb(jobId: string): Promise<void> {
  const baseUrl = getAutoMtBaseUrlWeb()
  
  const response = await fetch(`${baseUrl}/v1/jobs/${jobId}/commit`, {
    method: 'POST',
  })
  
  if (!response.ok) {
    throw new Error(`Failed to commit solution: ${response.status} ${response.statusText}`)
  }
}

export const webPlatform: PlatformAPI = {
  getEvents: fetchEvents,
  getEventById: fetchEventById,
  getWaveform: fetchWaveform,
  openFile: openFileWeb,
  saveFile: saveFileWeb,
  initializeInteractiveJob: initializeInteractiveJobWeb,
  startStationPreparation: startStationPreparationWeb,
  startWaveformPreparation: startWaveformPreparationWeb,
  startStationSelection: startStationSelectionWeb,
  startInversion: startInversionWeb,
  getInteractiveTaskStatus: fetchInteractiveTaskStatusWeb,
  getInteractiveTaskStreamLogsUrl: buildInteractiveTaskStreamLogsUrlWeb,
  getJobProgress: fetchJobProgressWeb,
  getJobContext: fetchJobContext,
  getJobSolutions: fetchJobSolutionsWeb,
  getJobResults: fetchJobResultsWeb,
  getJobGreenFunctions: fetchJobGreenFunctionsWeb,
  updateStationWeights: updateStationWeightsWeb,
  toggleStationActive: toggleStationActiveWeb,
  updateFrequencyFilter: updateFrequencyFilterWeb,
  runDepthSearch: runDepthSearchWeb,
  optimizeInversion: optimizeInversionWeb,
  commitSolution: commitSolutionWeb,
}

// ─── Electron implementation (stub — filled in Phase 2) ──────────────────────

declare global {
  interface Window {
    electronAPI?: {
      getEvents: (filter: EventFilter) => Promise<SeismicEvent[]>
      getEventById: (eventId: string) => Promise<SeismicEvent>
      getWaveform: (params: WaveformRequest) => Promise<ArrayBuffer>
      openFile: (options?: { accept?: string }) => Promise<string | null>
      saveFile: (data: ArrayBuffer, filename: string) => Promise<boolean>
      initializeInteractiveJob: (request: InteractiveJobInitRequest) => Promise<InteractiveJobInitResponse>
      startStationPreparation: (jobId: string) => Promise<InteractiveJobInitResponse>
      startWaveformPreparation: (jobId: string) => Promise<InteractiveJobInitResponse>
      startStationSelection: (jobId: string, request?: StationSelectionRequest) => Promise<InteractiveJobInitResponse>
      startInversion: (jobId: string, request?: InversionRequest) => Promise<InteractiveJobInitResponse>
      getInteractiveTaskStatus: (taskId: string) => Promise<InteractiveTaskStatus>
      getInteractiveTaskStreamLogsUrl: (taskIdOrJobId: string) => string
      getJobProgress: (jobId: string) => Promise<JobProgressSnapshot>
      getJobContext: (jobId: string) => Promise<ProcessingContext>
      getJobSolutions: (jobId: string) => Promise<JobSolutionsResponse>
      getJobResults: (jobId: string) => Promise<JobResultsResponse>
      getJobGreenFunctions: (jobId: string, options?: JobGreenFunctionsRequest) => Promise<JobGreenFunctionsResponse>
      updateStationWeights: (jobId: string, weights: Record<string, number>) => Promise<void>
      toggleStationActive: (jobId: string, stationKey: string, active: boolean) => Promise<void>
      updateFrequencyFilter: (jobId: string, fmin: number, fmax: number) => Promise<MomentTensorSolution>
      runDepthSearch: (jobId: string, params: DepthSearchParams) => Promise<MomentTensorSolution>
      optimizeInversion: (jobId: string) => Promise<MomentTensorSolution>
      commitSolution: (jobId: string) => Promise<void>
    }
  }
}

export const electronPlatform: PlatformAPI = {
  getEvents: (filter) => window.electronAPI!.getEvents(filter),
  getEventById: (eventId) => window.electronAPI!.getEventById(eventId),
  getWaveform: (params) => window.electronAPI!.getWaveform(params),
  openFile: (opts) => window.electronAPI!.openFile(opts),
  saveFile: async (data, filename) => {
    const buf = await data.arrayBuffer()
    return window.electronAPI!.saveFile(buf, filename)
  },
  initializeInteractiveJob: (request) => window.electronAPI!.initializeInteractiveJob(request),
  startStationPreparation: (jobId) => window.electronAPI!.startStationPreparation(jobId),
  startWaveformPreparation: (jobId) => window.electronAPI!.startWaveformPreparation(jobId),
  startStationSelection: (jobId, request) => window.electronAPI!.startStationSelection(jobId, request),
  startInversion: (jobId, request) => window.electronAPI!.startInversion(jobId, request),
  getInteractiveTaskStatus: (taskId) => window.electronAPI!.getInteractiveTaskStatus(taskId),
  getInteractiveTaskStreamLogsUrl: (taskIdOrJobId) => window.electronAPI!.getInteractiveTaskStreamLogsUrl(taskIdOrJobId),
  getJobProgress: (jobId) => window.electronAPI!.getJobProgress(jobId),
  getJobContext: (jobId) => window.electronAPI!.getJobContext(jobId),
  getJobSolutions: (jobId) => window.electronAPI!.getJobSolutions(jobId),
  getJobResults: (jobId) => window.electronAPI!.getJobResults(jobId),
  getJobGreenFunctions: (jobId, options) => window.electronAPI!.getJobGreenFunctions(jobId, options),
  updateStationWeights: (jobId, weights) => window.electronAPI!.updateStationWeights(jobId, weights),
  toggleStationActive: (jobId, stationKey, active) => window.electronAPI!.toggleStationActive(jobId, stationKey, active),
  updateFrequencyFilter: (jobId, fmin, fmax) => window.electronAPI!.updateFrequencyFilter(jobId, fmin, fmax),
  runDepthSearch: (jobId, params) => window.electronAPI!.runDepthSearch(jobId, params),
  optimizeInversion: (jobId) => window.electronAPI!.optimizeInversion(jobId),
  commitSolution: (jobId) => window.electronAPI!.commitSolution(jobId),
}

// ─── Auto-detect & export ─────────────────────────────────────────────────────

export const platform: PlatformAPI =
  typeof window !== 'undefined' && window.electronAPI !== undefined
    ? electronPlatform
    : webPlatform
