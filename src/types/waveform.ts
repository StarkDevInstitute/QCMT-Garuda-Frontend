// ─── Waveform-Specific Types for Interactive Analysis ────────────────────────

import type { ProcessingParams, StationMTContribution } from './seismology'

// ─── Job Stage (from AutoMT Interactive-Processor) ───────────────────────────

export type JobStage = 
  | 'INIT'              // Job created, no processing yet
  | 'PREPROCESS'        // Waveform preprocessing (filtering, rotation)
  | 'SELECT_STATIONS'   // Station selection phase
  | 'INVERT'            // Moment tensor inversion running
  | 'OPTIMIZED'         // Best solution found
  | 'COMMITTED'         // Solution committed to catalog
  | 'FAILED'            // Processing failed

// ─── Processing Context (from AutoMT API /jobs/{jobId}/context) ──────────────

export interface ProcessingContext {
  job_id: string
  event_id: string
  current_stage: JobStage
  event: {
    lat: number
    lon: number
    depth_km: number
    mag: number
    origin_time: string
  }
  params: ProcessingParams
  valid_waveforms: Record<string, StationMetadata>  // key: "NET.STA.LOC.CHA"
  selected_stations: string[]                       // Array of station keys
  best_solution?: MomentTensorSolution
}

// ─── Station Metadata (from AutoMT API) ──────────────────────────────────────

export interface StationMetadata {
  network: string
  station: string
  location: string
  channel: string
  distance_deg: number
  distance_km: number
  azimuth_deg: number
  backazimuth_deg: number
  Z?: ComponentQuality
  R?: ComponentQuality
  T?: ComponentQuality
}

export interface ComponentQuality {
  snr: number              // Signal-to-noise ratio
  is_valid: boolean        // Whether component passes quality check
  weight: number           // 0.0-1.0 importance weight
}

// ─── Moment Tensor Solution (from AutoMT API) ────────────────────────────────

import type { NodalPlanes } from './seismology'

export interface MomentTensorSolution {
  depth_km: number
  latitude?: number
  longitude?: number
  variance_reduction: number    // 0.0-1.0 (0.68 = 68% fit)
  dc_perc: number              // Double-couple percentage
  clvd_perc: number            // CLVD percentage
  iso_perc: number             // Isotropic percentage
  scalar_moment: number        // N·m
  magnitude_mw: number
  moment_tensor?: {
    m11: number
    m22: number
    m33: number
    m12: number
    m13: number
    m23: number
  }
  nodalPlanes?: NodalPlanes
  derived?: {
    fit_percent?: number
    avg_scale?: number
    stations_used?: number
    azimuthal_gap?: number
    dc100?: number
    clvd100?: number
  }
  tensor: {
    mrr: number
    mtt: number
    mpp: number
    mrt: number
    mrp: number
    mtp: number
  }
}

// ─── Combined Station Data for UI ─────────────────────────────────────────────

export interface StationWaveformData {
  stationKey: string           // "NET.STA.LOC.CHA"
  metadata: StationMetadata
  contribution: StationMTContribution
  distanceGroup: DistanceGroup
  isSelected: boolean
  isActive: boolean            // Excluded from inversion or not
}

// ─── Download Progress State (for modal) ──────────────────────────────────────

export interface WaveformDownloadState {
  isDownloading: boolean
  progress: number             // 0-100
  totalStations: number
  completedStations: number
  currentStation?: string
  errors: Array<{ station: string; message: string }>
}

export interface WaveformProgressLogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}

export interface WaveformProgressSnapshot {
  stage: string | null
  status: string | null
  progress: number
  message: string | null
  taskId: string | null
  streamUrl: string | null
  latestTaskStreamUrl: string | null
  updatedAt: string | null
}

// ─── Waveform Store State ─────────────────────────────────────────────────────

export type SortColumn = 'distance' | 'azimuth' | 'fit' | 'snr' | 'weight' | 'network' | 'station'
export type SortDirection = 'asc' | 'desc'

export interface WaveformState {
  jobId: string | null
  eventId: string | null
  context: ProcessingContext | null
  stations: StationWaveformData[]
  selectedStationKeys: Set<string>
  normalizationMode: NormalizationMode
  processingProfile: string
  frequencyFilter: { low: number; high: number }
  downloadState: WaveformDownloadState
  isLoading: boolean
  error: string | null
  isWaveformPrepReady: boolean
  progressSnapshot: WaveformProgressSnapshot
  progressLogs: WaveformProgressLogEntry[]
  isProgressTracking: boolean
  progressConnection: 'idle' | 'polling' | 'sse'
  progressError: string | null
  // Table UI state
  sortColumn: SortColumn | null
  sortDirection: SortDirection
  distanceGroupFilter: Set<DistanceGroup>
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export type NormalizationMode = 'trace' | 'single' | 'all' | 'none'
export type DistanceGroup = 'local' | 'regional' | 'teleseismic'
export type PhaseType = 'P' | 'S' | 'Rayleigh' | 'Love'
export type ComponentType = 'Z' | 'R' | 'T'
